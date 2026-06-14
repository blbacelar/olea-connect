import "server-only";

import type { MembershipTier, Webinar } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

export async function getWebinars(): Promise<Webinar[]> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { data: events, error: eventsError },
    { data: access, error: accessError },
    { data: registrations, error: registrationsError },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, slug, title, summary, status, starts_at, ends_at, timezone, capacity, recording_url",
      )
      .eq("type", "webinar")
      .order("starts_at", { ascending: false }),
    supabase.from("event_plan_access").select("event_id, plan_id"),
    supabase
      .from("event_registrations")
      .select("event_id")
      .eq("organization_id", organization.id)
      .eq("user_id", member.id)
      .neq("status", "canceled"),
  ]);

  if (eventsError) throw eventsError;
  if (accessError) throw accessError;
  if (registrationsError) throw registrationsError;

  const registrationsSet = new Set(
    (registrations ?? []).map((registration) => registration.event_id),
  );
  const accessByEvent = new Map<string, MembershipTier[]>();
  for (const item of access ?? []) {
    const plans = accessByEvent.get(item.event_id) ?? [];
    plans.push(item.plan_id as MembershipTier);
    accessByEvent.set(item.event_id, plans);
  }

  return (events ?? []).map((event) => {
    const allowedPlanIds = accessByEvent.get(event.id) ?? [];
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      status: event.status,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      timezone: event.timezone,
      capacity: event.capacity,
      recordingUrl: event.recording_url,
      available: allowedPlanIds.includes(organization.tier),
      registered: registrationsSet.has(event.id),
      allowedPlanIds,
    };
  });
}
