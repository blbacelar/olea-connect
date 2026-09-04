import { NextResponse } from "next/server";

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
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return jsonError("Sign in to watch this recording.", 401);

  const membership = await getActiveMembership(supabase, userId);
  if (!membership) return jsonError("Membership is required.", 403);

  const subscription = await getActiveSubscription(
    supabase,
    membership.organization_id,
  );
  if (!subscription) return jsonError("An active membership is required.", 403);

  const accessData = await getRecordingAccessData({
    eventId: params.eventId,
    planId: subscription.plan_id,
    supabase,
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

async function getActiveMembership(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
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

async function getRecordingAccessData({
  eventId,
  planId,
  supabase,
}: {
  eventId: string;
  planId: string | null;
  supabase: SupabaseServerClient;
}) {
  const [{ data: event, error: eventError }, { data: access, error: accessError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, status, recording_storage_path, recording_url")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("event_plan_access")
        .select("event_id")
        .eq("event_id", eventId)
        .eq("plan_id", planId)
        .maybeSingle(),
    ]);

  if (eventError) throw eventError;
  if (accessError) throw accessError;

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
