import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MembershipTier, Webinar } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

type EventAccessRow = {
  event_id: string;
  plan_id: MembershipTier;
  included: boolean;
  complimentary_ticket_limit: number | null;
  ticket_price_cents: number | null;
  currency: string;
};

type EventRow = {
  id: string;
  type: Webinar["type"];
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  status: Webinar["status"];
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number | null;
  meeting_provider: string | null;
  provider_event_id: string | null;
  join_url: string | null;
  recording_storage_path: string | null;
  recording_url: string | null;
};

const eventTypes = [
  "webinar",
  "speaker_session",
  "funder_ama",
  "networking",
  "workshop",
  "summit",
] as const;
const platformEventRoles = ["super_admin", "community_admin"] as const;

function logWebinarDataError(label: string, error: unknown) {
  console.warn(`Unable to load webinar ${label}; showing safe empty state.`, {
    error,
  });
}

async function canManageEvents(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", [...platformEventRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

function mapWebinars({
  access,
  events,
  organizationRegistrations,
  organizationTier,
  registrations,
}: {
  access: EventAccessRow[] | null;
  events: EventRow[] | null;
  organizationRegistrations: Array<{ event_id: string }> | null;
  organizationTier: MembershipTier;
  registrations: Array<{
    event_id: string;
    status: Webinar["registrationStatus"];
  }> | null;
}) {
  const registrationsSet = new Set(
    (registrations ?? []).map((registration) => registration.event_id),
  );
  const registrationStatusByEvent = new Map(
    (registrations ?? []).map((registration) => [
      registration.event_id,
      registration.status,
    ]),
  );
  const accessByEvent = new Map<string, EventAccessRow[]>();
  for (const item of (access ?? []) as EventAccessRow[]) {
    const plans = accessByEvent.get(item.event_id) ?? [];
    plans.push(item);
    accessByEvent.set(item.event_id, plans);
  }
  const organizationRegistrationCountByEvent = new Map<string, number>();
  for (const registration of organizationRegistrations ?? []) {
    organizationRegistrationCountByEvent.set(
      registration.event_id,
      (organizationRegistrationCountByEvent.get(registration.event_id) ?? 0) + 1,
    );
  }

  return (events ?? []).map((event): Webinar => {
    const accessRules = accessByEvent.get(event.id) ?? [];
    const currentPlanAccess = accessRules.find(
      (rule) => rule.plan_id === organizationTier,
    );
    const allowedPlanIds = accessRules.map((rule) => rule.plan_id);
    const recordingAvailable = Boolean(
      event.recording_storage_path || event.recording_url,
    );
    return {
      id: event.id,
      slug: event.slug,
      type: event.type,
      title: event.title,
      summary: event.summary,
      description: event.description,
      status: event.status,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      timezone: event.timezone,
      capacity: event.capacity,
      joinUrl: event.join_url,
      meetingProvider: event.meeting_provider,
      providerEventId: event.provider_event_id,
      recordingAvailable,
      available: Boolean(currentPlanAccess),
      registered: registrationsSet.has(event.id),
      registrationStatus: registrationStatusByEvent.get(event.id) ?? null,
      included: currentPlanAccess?.included ?? false,
      complimentaryTicketLimit:
        currentPlanAccess?.complimentary_ticket_limit ?? null,
      complimentaryTicketsUsed:
        organizationRegistrationCountByEvent.get(event.id) ?? 0,
      ticketPriceCents: currentPlanAccess?.ticket_price_cents ?? null,
      currency: currentPlanAccess?.currency ?? "CAD",
      allowedPlanIds,
    };
  });
}

async function loadWebinarContext() {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  return { member, organization, supabase };
}

export async function getWebinarCatalog(): Promise<{
  canManageEvents: boolean;
  webinars: Webinar[];
}> {
  const { member, organization, supabase } = await loadWebinarContext();
  const [
    { data: events, error: eventsError },
    { data: access, error: accessError },
    { data: registrations, error: registrationsError },
    {
      data: organizationRegistrations,
      error: organizationRegistrationsError,
    },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, type, slug, title, summary, description, status, starts_at, ends_at, timezone, capacity, meeting_provider, provider_event_id, join_url, recording_storage_path, recording_url",
      )
      .in("type", [...eventTypes])
      .order("starts_at", { ascending: false }),
    supabase
      .from("event_plan_access")
      .select(
        "event_id, plan_id, included, complimentary_ticket_limit, ticket_price_cents, currency",
      ),
    supabase
      .from("event_registrations")
      .select("event_id, status")
      .eq("organization_id", organization.id)
      .eq("user_id", member.id)
      .neq("status", "canceled"),
    supabase
      .from("event_registrations")
      .select("event_id")
      .eq("organization_id", organization.id)
      .neq("status", "canceled"),
  ]);

  if (eventsError) {
    logWebinarDataError("events", eventsError);
    return { canManageEvents: await canManageEvents(supabase, member.id), webinars: [] };
  }
  if (accessError) {
    logWebinarDataError("plan access", accessError);
    return { canManageEvents: await canManageEvents(supabase, member.id), webinars: [] };
  }
  if (registrationsError) {
    logWebinarDataError("member registrations", registrationsError);
  }
  if (organizationRegistrationsError) {
    logWebinarDataError(
      "organization registrations",
      organizationRegistrationsError,
    );
  }

  return {
    canManageEvents: await canManageEvents(supabase, member.id),
    webinars: mapWebinars({
      access: (access ?? []) as EventAccessRow[],
      events: (events ?? []) as EventRow[],
      organizationRegistrations,
      organizationTier: organization.tier,
      registrations: (registrations ?? []) as Array<{
        event_id: string;
        status: Webinar["registrationStatus"];
      }>,
    }),
  };
}

export async function getWebinars(): Promise<Webinar[]> {
  const { webinars } = await getWebinarCatalog();
  return webinars;
}

export async function getWebinarBySlug(slug: string): Promise<Webinar | null> {
  const { member, organization, supabase } = await loadWebinarContext();
  const [
    { data: event, error: eventError },
    { data: access, error: accessError },
    { data: registrations, error: registrationsError },
    {
      data: organizationRegistrations,
      error: organizationRegistrationsError,
    },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, type, slug, title, summary, description, status, starts_at, ends_at, timezone, capacity, meeting_provider, provider_event_id, join_url, recording_storage_path, recording_url",
      )
      .eq("slug", slug)
      .in("type", [...eventTypes])
      .maybeSingle(),
    supabase
      .from("event_plan_access")
      .select(
        "event_id, plan_id, included, complimentary_ticket_limit, ticket_price_cents, currency",
      ),
    supabase
      .from("event_registrations")
      .select("event_id, status")
      .eq("organization_id", organization.id)
      .eq("user_id", member.id)
      .neq("status", "canceled"),
    supabase
      .from("event_registrations")
      .select("event_id")
      .eq("organization_id", organization.id)
      .neq("status", "canceled"),
  ]);

  if (eventError) throw eventError;
  if (accessError) throw accessError;
  if (registrationsError) throw registrationsError;
  if (organizationRegistrationsError) throw organizationRegistrationsError;
  if (!event) return null;

  return (
    mapWebinars({
      access: (access ?? []) as EventAccessRow[],
      events: [event as EventRow],
      organizationRegistrations,
      organizationTier: organization.tier,
      registrations: (registrations ?? []) as Array<{
        event_id: string;
        status: Webinar["registrationStatus"];
      }>,
    })[0] ?? null
  );
}

export async function canCurrentUserManageEvents() {
  const { member, supabase } = await loadWebinarContext();
  return canManageEvents(supabase, member.id);
}

export { eventTypes, platformEventRoles };
