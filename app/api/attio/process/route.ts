import { NextResponse } from "next/server";

import { processAttioIntegrationEvent } from "@/lib/attio/sync";
import {
  failIntegrationEvent,
  isCronAuthorized,
} from "@/lib/integrations/outbox";
import {
  getRequestContext,
  logCritical,
  logInfo,
  logWarn,
} from "@/lib/observability/logger";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestContext = getRequestContext(request, {
    component: "attio_worker",
    provider: "attio",
  });

  if (!isCronAuthorized(request)) {
    logWarn("Attio worker rejected unauthorized request", requestContext);
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: event, error } = await supabase.rpc(
    "claim_attio_integration_event",
  );

  if (error) {
    logCritical("Unable to claim Attio integration event", error, requestContext);
    throw error;
  }
  if (!event) {
    logInfo("Attio worker found no queued event", requestContext);
    return NextResponse.json({ processed: false });
  }

  try {
    await processAttioIntegrationEvent(supabase, event);
    logInfo("Attio integration event processed", {
      ...requestContext,
      eventId: event.id,
      eventType: event.event_type,
    });
    return NextResponse.json({ processed: true, eventId: event.id });
  } catch (processError) {
    await failIntegrationEvent(supabase, event, processError);
    logCritical("Unable to process Attio integration event", processError, {
      ...requestContext,
      eventId: event.id,
      eventType: event.event_type,
    });
    return NextResponse.json(
      { error: "Attio integration failed." },
      { status: 500 },
    );
  }
}
