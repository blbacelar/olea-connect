import { NextResponse } from "next/server";

import { processCommunityModerationEvent } from "@/lib/community/moderation-worker";
import {
  failIntegrationEvent,
  isCronAuthorized,
} from "@/lib/integrations/outbox";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const maxEventsPerRun = 10;

function getTargetEventId(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId");
  return eventId?.trim() || null;
}

async function claimTargetedEvent(
  eventId: string,
  supabase: ReturnType<typeof createAdminClient>,
) {
  const { data: pendingEvent, error: pendingEventError } = await supabase
    .from("integration_events")
    .select("attempts")
    .eq("id", eventId)
    .eq("provider", "community_moderation")
    .in("status", ["pending", "failed"])
    .lt("attempts", 5)
    .maybeSingle();

  if (pendingEventError) throw pendingEventError;
  if (!pendingEvent) return null;

  const { data, error } = await supabase
    .from("integration_events")
    .update({
      attempts: pendingEvent.attempts + 1,
      last_error: null,
      processing_started_at: new Date().toISOString(),
      status: "processing",
    })
    .eq("id", eventId)
    .eq("provider", "community_moderation")
    .in("status", ["pending", "failed"])
    .eq("attempts", pendingEvent.attempts)
    .select("id, event_type, payload, attempts")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const processedEventIds: string[] = [];
  const targetEventId = getTargetEventId(request);

  if (targetEventId) {
    const event = await claimTargetedEvent(targetEventId, supabase);
    if (!event) {
      return NextResponse.json({ processed: 0, eventIds: [] });
    }

    try {
      await processCommunityModerationEvent(supabase, event);
      return NextResponse.json({ processed: 1, eventIds: [event.id] });
    } catch (processError) {
      await failIntegrationEvent(supabase, event, processError);
      throw processError;
    }
  }

  for (let index = 0; index < maxEventsPerRun; index += 1) {
    const { data: event, error } = await supabase.rpc(
      "claim_community_moderation_integration_event",
    );

    if (error) throw error;
    if (!event) break;

    try {
      await processCommunityModerationEvent(supabase, event);
      processedEventIds.push(event.id);
    } catch (processError) {
      await failIntegrationEvent(supabase, event, processError);
      console.error(
        `Unable to process community moderation event ${event.id}`,
        processError,
      );
      return NextResponse.json(
        {
          error: "Community moderation failed.",
          processed: processedEventIds.length,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    processed: processedEventIds.length,
    eventIds: processedEventIds,
  });
}
