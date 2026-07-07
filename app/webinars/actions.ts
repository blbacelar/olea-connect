"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const platformEventRoles = ["super_admin", "community_admin"] as const;

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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
  if (!role) throw new Error("Only platform event admins can import attendance.");

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
