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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!z.string().uuid().safeParse(params.eventId).success) {
    return jsonError("This recording is not available.", 404);
  }

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return jsonError("Sign in to watch this recording.", 401);

  const memberships = await getActiveMemberships(supabase, userId);
  if (!memberships.length) return jsonError("Membership is required.", 403);

  const subscriptions = await getActiveSubscriptions(supabase, memberships);
  if (!subscriptions.length) {
    return jsonError("An active membership is required.", 403);
  }

  const accessData = await getRecordingAccessData({
    eventId: params.eventId,
    subscriptions,
    supabase,
    userId,
  });
  if (!accessData.event) {
    return jsonError("This recording is not available.", 404);
  }

  const accessError = getRecordingAccessError({
    access: accessData.access,
    eventStatus: accessData.event.status,
  });
  if (accessError) return accessError;

  return getRecordingRedirectResponse(supabase, accessData.event);
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

async function getActiveMemberships(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;
  return data ?? [];
}

async function getActiveSubscriptions(
  supabase: SupabaseServerClient,
  memberships: Array<{ organization_id: string }>,
) {
  const subscriptions = await Promise.all(
    memberships.map(async ({ organization_id: organizationId }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, plan_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!activeSubscriptionStatuses.has(data?.status ?? "")) return null;
      if (!data?.plan_id) return null;
      return { organizationId, planId: data.plan_id };
    }),
  );

  return subscriptions.filter(
    (subscription): subscription is NonNullable<typeof subscription> =>
      subscription !== null,
  );
}

async function getRecordingAccessData({
  eventId,
  subscriptions,
  supabase,
  userId,
}: {
  eventId: string;
  subscriptions: Array<{ organizationId: string; planId: string }>;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const planIds = [...new Set(subscriptions.map(({ planId }) => planId))];
  const [
    { data: event, error: eventError },
    { data: accessRows, error: accessError },
    { data: registrations, error: registrationError },
  ] = await Promise.all([
    createAdminClient()
      .from("events")
      .select("id, status, recording_storage_path, recording_url")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("event_plan_access")
      .select("plan_id, included, complimentary_ticket_limit, ticket_price_cents")
      .eq("event_id", eventId)
      .in("plan_id", planIds),
    supabase
      .from("event_registrations")
      .select("organization_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .in("status", ["registered", "attended"]),
  ]);

  if (eventError) throw eventError;
  if (accessError) throw accessError;
  if (registrationError) throw registrationError;

  const registeredOrganizationIds = new Set(
    (registrations ?? []).map(({ organization_id: organizationId }) => organizationId),
  );
  const access = (accessRows ?? []).find((candidate) => {
    if (candidate.included) return true;
    if (candidate.complimentary_ticket_limit === null) return false;
    return subscriptions.some(
      (subscription) =>
        subscription.planId === candidate.plan_id &&
        registeredOrganizationIds.has(subscription.organizationId),
    );
  });

  return { access, event };
}

function getRecordingAccessError({
  access,
  eventStatus,
}: {
  access: Awaited<ReturnType<typeof getRecordingAccessData>>["access"];
  eventStatus: string;
}) {
  if (!access) {
    return jsonError("This recording is not included with your plan.", 403);
  }
  if (eventStatus !== "completed") {
    return jsonError("This recording is not available yet.", 404);
  }

  return null;
}

async function getRecordingRedirectResponse(
  supabase: SupabaseServerClient,
  event: NonNullable<Awaited<ReturnType<typeof getRecordingAccessData>>["event"]>,
) {
  if (event.recording_storage_path) {
    const { data, error } = await supabase.storage
      .from("event-recordings")
      .createSignedUrl(event.recording_storage_path, 10 * 60);
    if (error) throw error;
    return NextResponse.redirect(data.signedUrl);
  }

  if (event.recording_url?.startsWith("https://")) {
    return NextResponse.redirect(event.recording_url);
  }

  return jsonError("This recording is not available.", 404);
}
