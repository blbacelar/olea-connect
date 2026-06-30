import { NextResponse } from "next/server";

import {
  failIntegrationEvent,
  isCronAuthorized,
} from "@/lib/integrations/outbox";
import { processQuickBooksIntegrationEvent } from "@/lib/quickbooks/sync";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: event, error } = await supabase.rpc(
    "claim_quickbooks_integration_event",
  );

  if (error) throw error;
  if (!event) return NextResponse.json({ processed: false });

  try {
    await processQuickBooksIntegrationEvent(supabase, event);
    return NextResponse.json({ processed: true, eventId: event.id });
  } catch (processError) {
    await failIntegrationEvent(supabase, event, processError);
    console.error(
      `Unable to process QuickBooks event ${event.id}`,
      processError,
    );
    return NextResponse.json(
      { error: "QuickBooks integration failed." },
      { status: 500 },
    );
  }
}
