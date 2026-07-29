import { NextResponse } from "next/server";

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
import { processQuickBooksIntegrationEvent } from "@/lib/quickbooks/sync";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestContext = getRequestContext(request, {
    component: "quickbooks_worker",
    provider: "quickbooks",
  });

  if (!isCronAuthorized(request)) {
    logWarn("QuickBooks worker rejected unauthorized request", requestContext);
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: event, error } = await supabase.rpc(
    "claim_quickbooks_integration_event",
  );

  if (error) {
    logCritical("Unable to claim QuickBooks integration event", error, requestContext);
    throw error;
  }
  if (!event) {
    logInfo("QuickBooks worker found no queued event", requestContext);
    return NextResponse.json({ processed: false });
  }

  try {
    await processQuickBooksIntegrationEvent(supabase, event);
    logInfo("QuickBooks integration event processed", {
      ...requestContext,
      eventId: event.id,
      eventType: event.event_type,
    });
    return NextResponse.json({ processed: true, eventId: event.id });
  } catch (processError) {
    await failIntegrationEvent(supabase, event, processError);
    logCritical("Unable to process QuickBooks integration event", processError, {
      ...requestContext,
      eventId: event.id,
      eventType: event.event_type,
    });
    return NextResponse.json(
      { error: "QuickBooks integration failed." },
      { status: 500 },
    );
  }
}
