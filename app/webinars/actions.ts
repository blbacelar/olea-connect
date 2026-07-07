"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { eventTypes, platformEventRoles } from "@/lib/data/webinars";
import type { MembershipTier, Webinar } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const membershipTiers = ["seedling", "roots", "canopy", "harvest"] as const;
const creatableEventStatuses = ["scheduled", "live"] as const;
const accessModes = ["included", "complimentary", "paid"] as const;

export type WebinarActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function assertOneOf<T extends readonly string[]>(
  values: T,
  value: string,
  message: string,
): asserts value is T[number] {
  if (!values.includes(value)) throw new Error(message);
}

function parsePositiveInteger(value: string, message: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(message);
  return parsed;
}

function parseOptionalPositiveInteger(value: string, message: string) {
  if (!value) return null;
  return parsePositiveInteger(value, message);
}

function parseIsoDate(value: string, message: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(message);
  return date;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

  return slug || "webinar";
}

async function requireEventAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before managing event operations.");

  const admin = createAdminClient();
  const { data: role, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...platformEventRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!role) throw new Error("Only platform event admins can manage events.");

  return { admin, userId: user.id };
}

async function loadRegistrationContext(eventId: string) {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { data: subscription, error: subscriptionError },
    { data: event, error: eventError },
    { data: access, error: accessError },
    { count: registrationCount, error: registrationCountError },
    {
      count: organizationRegistrationCount,
      error: organizationRegistrationCountError,
    },
    { data: existingRegistration, error: existingRegistrationError },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, status, capacity, registration_opens_at, registration_closes_at")
      .eq("id", eventId)
      .single(),
    supabase
      .from("event_plan_access")
      .select("included, complimentary_ticket_limit, ticket_price_cents")
      .eq("event_id", eventId)
      .eq("plan_id", organization.tier)
      .maybeSingle(),
    supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("status", "canceled"),
    supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("organization_id", organization.id)
      .neq("status", "canceled"),
    supabase
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", member.id)
      .maybeSingle(),
  ]);

  if (subscriptionError) throw subscriptionError;
  if (eventError) throw eventError;
  if (accessError) throw accessError;
  if (registrationCountError) throw registrationCountError;
  if (organizationRegistrationCountError) throw organizationRegistrationCountError;
  if (existingRegistrationError) throw existingRegistrationError;

  if (!activeSubscriptionStatuses.has(subscription?.status ?? "")) {
    throw new Error("An active membership is required to register for events.");
  }
  if (!access) throw new Error("This event is not included with your plan.");
  if (
    event.status !== "scheduled" &&
    event.status !== "live" &&
    event.status !== "rescheduled"
  ) {
    throw new Error(
      "Registration is only available for scheduled, live, or rescheduled events.",
    );
  }

  const now = Date.now();
  if (
    event.registration_opens_at &&
    new Date(event.registration_opens_at).getTime() > now
  ) {
    throw new Error("Registration is not open yet.");
  }
  if (
    event.registration_closes_at &&
    new Date(event.registration_closes_at).getTime() < now
  ) {
    throw new Error("Registration has closed.");
  }
  if (!access.included && access.ticket_price_cents && access.ticket_price_cents > 0) {
    throw new Error("Paid ticket checkout is not available yet.");
  }

  return {
    access,
    event,
    existingRegistration,
    member,
    organization,
    organizationRegistrationCount: organizationRegistrationCount ?? 0,
    registrationCount: registrationCount ?? 0,
    supabase,
  };
}

export async function registerForEvent(formData: FormData) {
  const eventId = getText(formData, "eventId");
  const {
    event,
    existingRegistration,
    member,
    organization,
    organizationRegistrationCount,
    registrationCount,
    supabase,
    access,
  } = await loadRegistrationContext(eventId);

  if (
    existingRegistration &&
    existingRegistration.status !== "canceled"
  ) {
    revalidatePath("/webinars");
    return;
  }

  if (
    !access.included &&
    access.complimentary_ticket_limit !== null &&
    organizationRegistrationCount >= access.complimentary_ticket_limit
  ) {
    throw new Error("The complimentary ticket limit has been reached for your plan.");
  }

  const status =
    event.capacity && registrationCount >= event.capacity
      ? "waitlisted"
      : "registered";
  const baseValues = {
    event_id: eventId,
    organization_id: organization.id,
    user_id: member.id,
    status,
    guest_name: member.name,
    guest_email: member.email.toLowerCase(),
    registration_source: "olea",
    last_provider_sync_at: new Date().toISOString(),
  };

  const query = existingRegistration
    ? supabase
        .from("event_registrations")
        .update(baseValues)
        .eq("id", existingRegistration.id)
    : supabase.from("event_registrations").insert(baseValues);

  const { data: registration, error } = await query.select("id").single();
  if (error) throw error;

  const { error: providerError } = await supabase
    .from("event_registrations")
    .update({
      provider_registration_id: `zoom-manual:${registration.id}`,
      last_provider_sync_at: new Date().toISOString(),
    })
    .eq("id", registration.id);
  if (providerError) throw providerError;

  revalidatePath("/webinars");
}

export async function createWebinarEvent(formData: FormData) {
  try {
    const { admin, userId } = await requireEventAdmin();
    const title = getText(formData, "title");
    const summary = getText(formData, "summary");
    const description = getText(formData, "description");
    const type = getText(formData, "type");
    const status = getText(formData, "status") || "scheduled";
    const startsAt = parseIsoDate(
      getText(formData, "startsAtIso"),
      "Choose a valid start date and time.",
    );
    const endsAt = parseIsoDate(
      getText(formData, "endsAtIso"),
      "Choose a valid end date and time.",
    );
    const timezone = getText(formData, "timezone") || "America/Vancouver";
    const joinUrl = getText(formData, "joinUrl");
    const providerEventId = getText(formData, "providerEventId");
    const accessMode = getText(formData, "accessMode") || "included";
    const selectedPlanIds = formData
      .getAll("planIds")
      .map((value) => String(value));

    assertOneOf(eventTypes, type, "Choose a supported event type.");
    assertOneOf(creatableEventStatuses, status, "Choose a supported event status.");
    assertOneOf(accessModes, accessMode, "Choose a supported access rule.");

    if (title.length < 3) throw new Error("Enter a webinar title.");
    if (summary.length < 10) throw new Error("Enter a short webinar summary.");
    if (endsAt <= startsAt) throw new Error("End time must be after start time.");
    if (!joinUrl.startsWith("https://")) {
      throw new Error("Enter a secure Zoom URL that starts with https://.");
    }
    if (!selectedPlanIds.length) {
      throw new Error("Choose at least one membership plan.");
    }

    const planIds = selectedPlanIds.map((planId) => {
      assertOneOf(membershipTiers, planId, "Choose supported membership plans.");
      return planId;
    });
    const complimentaryLimit =
      accessMode === "complimentary"
        ? parsePositiveInteger(
            getText(formData, "complimentaryTicketLimit"),
            "Enter a complimentary ticket limit greater than zero.",
          )
        : null;
    const ticketPriceCents =
      accessMode === "paid"
        ? parsePositiveInteger(
            getText(formData, "ticketPriceCents"),
            "Enter a paid ticket amount in cents greater than zero.",
          )
        : parseOptionalPositiveInteger(
            getText(formData, "ticketPriceCents"),
            "Ticket amount must be greater than zero.",
          );
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;

    const { data: event, error: eventError } = await admin
      .from("events")
      .insert({
        type,
        status,
        slug,
        title,
        summary,
        description: description || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        timezone,
        registration_opens_at: new Date().toISOString(),
        registration_closes_at: startsAt.toISOString(),
        meeting_provider: "zoom",
        provider_event_id: providerEventId || null,
        join_url: joinUrl,
        created_by: userId,
      })
      .select("id, slug")
      .single();

    if (eventError) throw eventError;

    const { error: accessError } = await admin.from("event_plan_access").insert(
      planIds.map((planId: MembershipTier) => ({
        event_id: event.id,
        plan_id: planId,
        included: accessMode === "included",
        complimentary_ticket_limit: complimentaryLimit,
        ticket_price_cents: ticketPriceCents,
        currency: "CAD",
      })),
    );

    if (accessError) {
      await admin.from("events").delete().eq("id", event.id);
      throw accessError;
    }

    revalidatePath("/webinars");
    revalidatePath("/webinars/manage");
    return { slug: event.slug as Webinar["slug"] };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not create this webinar. Please review the details.",
    };
  }
}

export async function archiveWebinarEvent(
  _previousState: WebinarActionState,
  formData: FormData,
): Promise<WebinarActionState> {
  try {
    const eventId = getText(formData, "eventId");
    const { admin } = await requireEventAdmin();
    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, slug, ends_at, status")
      .eq("id", eventId)
      .in("type", [...eventTypes])
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) throw new Error("Webinar not found.");
    if (event.status === "archived") {
      revalidatePath("/webinars");
      revalidatePath("/webinars/manage");
      revalidatePath(`/webinars/${event.slug}`);
      return {
        message: "This webinar is already archived.",
        status: "success",
      };
    }

    const hasEnded = new Date(event.ends_at).getTime() < Date.now();
    if (!hasEnded && event.status !== "canceled") {
      throw new Error(
        "Only past or canceled webinars can be archived.",
      );
    }

    const { error } = await admin
      .from("events")
      .update({ status: "archived" })
      .eq("id", event.id);

    if (error) throw error;
    revalidatePath("/webinars");
    revalidatePath("/webinars/manage");
    revalidatePath(`/webinars/${event.slug}`);
    return {
      message: "Webinar archived.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not archive this webinar. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function cancelEventRegistration(formData: FormData) {
  const eventId = getText(formData, "eventId");
  const { member } = await requireMemberContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_registrations")
    .update({ status: "canceled" })
    .eq("event_id", eventId)
    .eq("user_id", member.id)
    .neq("status", "canceled");

  if (error) throw error;
  revalidatePath("/webinars");
}

export async function importEventAttendance(formData: FormData) {
  const eventId = getText(formData, "eventId");
  const userId = getText(formData, "userId");
  const providerRegistrationId = getText(formData, "providerRegistrationId");
  const providerAttendanceId = getText(formData, "providerAttendanceId");
  const duration = Number.parseInt(getText(formData, "watchDurationSeconds"), 10);
  const watchDurationSeconds =
    Number.isFinite(duration) && duration >= 0 ? duration : null;
  const { admin } = await requireEventAdmin();
  const attendanceUpdate: Record<string, string | number | null> = {
    attended_at: new Date().toISOString(),
    attendance_imported_at: new Date().toISOString(),
    provider_attendance_id: providerAttendanceId || null,
    status: "attended",
    watch_duration_seconds: watchDurationSeconds,
  };

  if (providerRegistrationId) {
    attendanceUpdate.provider_registration_id = providerRegistrationId;
  }

  const { error } = await admin
    .from("event_registrations")
    .update(attendanceUpdate)
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
  revalidatePath("/webinars");
}
