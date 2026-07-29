import { NextResponse } from "next/server";

import { getRequestContext, logError, logInfo } from "@/lib/observability/logger";
import { REQUEST_ID_HEADER } from "@/lib/observability/request-id";
import { createPublicServerClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
};

function configured(value: string | undefined) {
  return value?.trim() ? "configured" : "missing";
}

export async function GET(request: Request) {
  const context = getRequestContext(request, { component: "health" });
  const requestId = String(context.requestId);

  const checks = {
    appUrl: configured(process.env.NEXT_PUBLIC_APP_URL),
    cronSecret: configured(process.env.CRON_SECRET),
    database: "unknown",
    supabasePublishableKey: configured(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    supabaseUrl: configured(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };

  try {
    const supabase = createPublicServerClient();
    const { error } = await supabase
      .from("membership_plans")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    checks.database = "ok";
    logInfo("Health check passed", context);
    return NextResponse.json(
      {
        checks,
        requestId,
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          ...noStoreHeaders,
          [REQUEST_ID_HEADER]: requestId,
        },
      },
    );
  } catch (error) {
    checks.database = "error";
    logError("Health check failed", error, context);
    return NextResponse.json(
      {
        checks,
        requestId,
        status: "degraded",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          ...noStoreHeaders,
          [REQUEST_ID_HEADER]: requestId,
        },
        status: 503,
      },
    );
  }
}
