import { createTestIdentity } from "../../factories/identity";
import type {
  CreatedEvent,
  CreatedOrganizationMember,
  CreatedOrganizationOwner,
  EventStatus,
  TestDataManager,
} from "../test-data.fixture";

function resolveEventStartsAt(startsAt?: string) {
  return startsAt ?? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
}

function resolveEventEndsAt(startsAt: string, endsAt?: string) {
  return endsAt ?? new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
}

export async function createEvent(this: TestDataManager,
  options: {
    accessPlanIds?: Array<"seedling" | "roots" | "canopy" | "harvest">;
    capacity?: number | null;
    complimentaryTicketLimit?: number | null;
    endsAt?: string;
    included?: boolean;
    joinUrl?: string | null;
    recordingStoragePath?: string | null;
    recordingUrl?: string | null;
    startsAt?: string;
    status?: EventStatus;
    ticketPriceCents?: number | null;
    title?: string;
    type?:
      | "webinar"
      | "speaker_session"
      | "funder_ama"
      | "networking"
      | "workshop"
      | "summit";
  } = {},
): Promise<CreatedEvent> {
  const identity = createTestIdentity(
    this.testInfo,
    ++this.identitySequence,
  );
  const startsAt = resolveEventStartsAt(options.startsAt);
  const startsAtTime = new Date(startsAt).getTime();
  const endsAt = resolveEventEndsAt(startsAt, options.endsAt);
  const slug = `${identity.marker}-event`;
  const title = options.title ?? `QA Zoom Event ${identity.marker}`;

  const { data: event, error } = await this.supabase
    .from("events")
    .insert({
      type: options.type ?? "webinar",
      status: options.status ?? "scheduled",
      slug,
      title,
      summary: "QA-created Zoom event for isolated E2E coverage.",
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: "America/Vancouver",
      capacity: options.capacity ?? 100,
      registration_opens_at: new Date(
        startsAtTime - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      registration_closes_at: new Date(startsAtTime - 15 * 60 * 1000).toISOString(),
      meeting_provider: "zoom",
      provider_event_id: `zoom-${identity.marker}`,
      join_url:
        options.joinUrl ??
        `https://zoom.us/j/${Date.now().toString().slice(-10)}`,
      recording_storage_path: options.recordingStoragePath,
      recording_url: options.recordingUrl,
    })
    .select("id")
    .single();

  if (error) throw error;
  const eventId = event.id as string;

  this.registerCleanup({
    label: `event ${eventId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (deleteError) throw deleteError;
    },
  });

  this.registerCleanup({
    label: `event integration events ${eventId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("integration_events")
        .delete()
        .eq("aggregate_type", "event")
        .eq("aggregate_id", eventId);
      if (deleteError) throw deleteError;
    },
  });

  const accessPlanIds = options.accessPlanIds ?? ["roots", "canopy", "harvest"];
  if (accessPlanIds.length) {
    const { error: accessError } = await this.supabase
      .from("event_plan_access")
      .insert(
        accessPlanIds.map((planId) => ({
          event_id: eventId,
          plan_id: planId,
          included: options.included ?? true,
          complimentary_ticket_limit: options.complimentaryTicketLimit ?? null,
          ticket_price_cents: options.ticketPriceCents ?? null,
        })),
      );
    if (accessError) throw accessError;
  }

  return { id: eventId, slug, title, startsAt };
}

export function trackEventCleanup(this: TestDataManager, eventId: string) {
  this.registerCleanup({
    label: `event ${eventId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (deleteError) throw deleteError;
    },
  });

  this.registerCleanup({
    label: `event integration events ${eventId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("integration_events")
        .delete()
        .eq("aggregate_type", "event")
        .eq("aggregate_id", eventId);
      if (deleteError) throw deleteError;
    },
  });
}

export async function updateEvent(this: TestDataManager,
  eventId: string,
  values: {
    endsAt?: string;
    startsAt?: string;
    status?: EventStatus;
    timezone?: string;
  },
) {
  const { error } = await this.supabase
    .from("events")
    .update({
      ...(values.endsAt ? { ends_at: values.endsAt } : {}),
      ...(values.startsAt ? { starts_at: values.startsAt } : {}),
      ...(values.status ? { status: values.status } : {}),
      ...(values.timezone ? { timezone: values.timezone } : {}),
    })
    .eq("id", eventId);

  if (error) throw error;
}

export async function getEventRegistration(this: TestDataManager, eventId: string, userId: string) {
  const { data, error } = await this.supabase
    .from("event_registrations")
    .select(
      "id, status, provider_registration_id, provider_attendance_id, watch_duration_seconds",
    )
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEventByTitle(this: TestDataManager, title: string) {
  const { data, error } = await this.supabase
    .from("events")
    .select("id, slug, title, join_url, status")
    .eq("title", title)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEventPlanAccess(this: TestDataManager, eventId: string) {
  const { data, error } = await this.supabase
    .from("event_plan_access")
    .select("plan_id, included, complimentary_ticket_limit, ticket_price_cents")
    .eq("event_id", eventId)
    .order("plan_id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getEventRegistrationCount(this: TestDataManager, eventId: string, userId: string) {
  const { count, error } = await this.supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function getEventEmailIntegrationEvents(this: TestDataManager, eventId: string) {
  const { data, error } = await this.supabase
    .from("integration_events")
    .select("event_type, aggregate_type, aggregate_id, provider, payload")
    .eq("aggregate_type", "event")
    .eq("aggregate_id", eventId)
    .eq("provider", "email")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createEventRegistration(this: TestDataManager,
  event: CreatedEvent,
  attendee: CreatedOrganizationOwner | CreatedOrganizationMember,
  options: {
    status?: "registered" | "waitlisted" | "attended" | "no_show";
  } = {},
) {
  const { data, error } = await this.supabase
    .from("event_registrations")
    .insert({
      event_id: event.id,
      organization_id: attendee.organizationId,
      user_id: attendee.userId,
      status: options.status ?? "registered",
      guest_name: "QA Event Attendee",
      guest_email: attendee.email,
      registration_source: "e2e",
    })
    .select("id")
    .single();

  if (error) throw error;
  const registrationId = data.id as string;

  this.registerCleanup({
    label: `event registration ${registrationId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("event_registrations")
        .delete()
        .eq("id", registrationId);
      if (deleteError) throw deleteError;
    },
  });

  return registrationId;
}
