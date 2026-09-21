import { NextResponse } from "next/server";
import * as z from "zod";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RouteContext = {
  params: {
    eventId: string;
  };
};

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const joinableEventStatuses = new Set(["scheduled", "live", "rescheduled"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!z.string().uuid().safeParse(params.eventId).success) {
    return jsonError("This event is not available.", 404);
  }

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return jsonError("Sign in to join this event.", 401);

  const registration = await getActiveRegistration(
    supabase,
    params.eventId,
    userId,
  );
  if (!registration) return jsonError("Register before joining this event.", 403);

  const membership = await getActiveMembership(
    supabase,
    userId,
    registration.organization_id,
  );
  if (!membership) return jsonError("Membership is required.", 403);

  const subscription = await getActiveSubscription(
    supabase,
    membership.organization_id,
  );
  if (!subscription) return jsonError("An active membership is required.", 403);

  const [event, access] = await Promise.all([
    getJoinEvent(params.eventId),
    getPlanAccess(supabase, params.eventId, subscription.plan_id),
  ]);

  if (!event) return jsonError("This event is not available.", 404);
  if (
    !access ||
    (!access.included && access.complimentary_ticket_limit === null)
  ) {
    return jsonError("This event is not included with your plan.", 403);
  }
  if (!joinableEventStatuses.has(event.status)) {
    return jsonError("This event is not open for joining.", 404);
  }
  const joinUrl = getSafeJoinUrl(event.join_url);
  if (!joinUrl) {
    return jsonError("The join link is not available.", 404);
  }

  return NextResponse.redirect(joinUrl);
}

function getSafeJoinUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    return url;
  } catch {
    return null;
  }
}

async function getAuthenticatedUserId(supabase: SupabaseServerClient) {
  const { data: userData, error: userError } = await supabase.auth
    .getUser()
    .catch((error: unknown) => ({
      data: { user: null },
      error,
    }));

  return userError ? null : userData.user?.id;
}

async function getActiveMembership(
  supabase: SupabaseServerClient,
  userId: string,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getActiveSubscription(
  supabase: SupabaseServerClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, plan_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!activeSubscriptionStatuses.has(data?.status ?? "")) return null;
  return data;
}

async function getJoinEvent(eventId: string) {
  const { data, error } = await createAdminClient()
    .from("events")
    .select("id, status, join_url")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getPlanAccess(
  supabase: SupabaseServerClient,
  eventId: string,
  planId: string | null,
) {
  const { data, error } = await supabase
    .from("event_plan_access")
    .select("event_id, included, complimentary_ticket_limit, ticket_price_cents")
    .eq("event_id", eventId)
    .eq("plan_id", planId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getActiveRegistration(
  supabase: SupabaseServerClient,
  eventId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("id, organization_id, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .in("status", ["registered", "attended"])
    .maybeSingle();

  if (error) throw error;
  return data;
}
