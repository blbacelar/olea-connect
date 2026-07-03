import "server-only";

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

export async function getWebinars(): Promise<Webinar[]> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
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
        "id, type, slug, title, summary, status, starts_at, ends_at, timezone, capacity, meeting_provider, provider_event_id, join_url, recording_storage_path, recording_url",
      )
      .in("type", [
        "webinar",
        "speaker_session",
        "funder_ama",
        "networking",
        "workshop",
        "summit",
      ])
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

  if (eventsError) throw eventsError;
  if (accessError) throw accessError;
  if (registrationsError) throw registrationsError;
  if (organizationRegistrationsError) throw organizationRegistrationsError;

  const registrationsSet = new Set(
    (registrations ?? []).map((registration) => registration.event_id),
  );
  const registrationStatusByEvent = new Map(
    (registrations ?? []).map((registration) => [
      registration.event_id,
      registration.status as Webinar["registrationStatus"],
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

  return (events ?? []).map((event) => {
    const accessRules = accessByEvent.get(event.id) ?? [];
    const currentPlanAccess = accessRules.find(
      (rule) => rule.plan_id === organization.tier,
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
