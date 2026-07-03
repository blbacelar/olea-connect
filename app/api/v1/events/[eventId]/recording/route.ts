import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const { data: userData, error: userError } = await supabase.auth
    .getUser()
    .catch((error: unknown) => ({
      data: { user: null },
      error,
    }));

  if (userError || !userData.user) {
    return jsonError("Sign in to watch this recording.", 401);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return jsonError("Membership is required.", 403);

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status, plan_id")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;
  if (!activeSubscriptionStatuses.has(subscription?.status ?? "")) {
    return jsonError("An active membership is required.", 403);
  }

  const [{ data: event, error: eventError }, { data: access, error: accessError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, status, recording_storage_path, recording_url")
        .eq("id", params.eventId)
        .maybeSingle(),
      supabase
        .from("event_plan_access")
        .select("event_id")
        .eq("event_id", params.eventId)
        .eq("plan_id", subscription?.plan_id)
        .maybeSingle(),
    ]);

  if (eventError) throw eventError;
  if (accessError) throw accessError;
  if (!event) return jsonError("This recording is not available.", 404);
  if (!access) return jsonError("This recording is not included with your plan.", 403);
  if (event.status !== "completed") {
    return jsonError("This recording is not available yet.", 404);
  }

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
