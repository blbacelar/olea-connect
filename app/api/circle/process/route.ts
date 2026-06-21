import { NextResponse } from "next/server";

import {
  failCircleIntegrationEvent,
  processCircleIntegrationEvent,
} from "@/lib/circle/provisioning";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: event, error } = await supabase.rpc(
    "claim_circle_integration_event",
  );

  if (error) throw error;
  if (!event) return NextResponse.json({ processed: false });

  try {
    await processCircleIntegrationEvent(supabase, event);
    return NextResponse.json({ processed: true, eventId: event.id });
  } catch (processError) {
    await failCircleIntegrationEvent(supabase, event, processError);
    console.error(`Unable to process Circle event ${event.id}`, processError);
    return NextResponse.json(
      { error: "Circle provisioning failed." },
      { status: 500 },
    );
  }
}
