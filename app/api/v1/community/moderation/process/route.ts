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

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const processedEventIds: string[] = [];

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
