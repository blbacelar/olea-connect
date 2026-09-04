"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { eventTypes } from "@/lib/data/webinars";
import { parseStrictInteger } from "@/lib/input-validation";
import { createClient } from "@/utils/supabase/server";
import {
  getActionErrorMessage,
  getText,
  loadRegistrationContext,
  requireEventAdmin,
  type WebinarActionState,
} from "./action-support";
import {
  type CreateWebinarEventResult,
  createWebinarEventFromForm,
} from "./webinar-create-support";

export type { WebinarActionState } from "./action-support";

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

export async function createWebinarEvent(
  formData: FormData,
): Promise<CreateWebinarEventResult> {
  try {
    return await createWebinarEventFromForm(formData);
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
  const rawDuration = getText(formData, "watchDurationSeconds");
  const watchDurationSeconds = rawDuration
    ? parseStrictInteger(rawDuration, "Watch duration", 0)
    : null;
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
