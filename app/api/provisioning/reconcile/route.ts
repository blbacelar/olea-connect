import { NextResponse } from "next/server";

import { reconcilePendingCheckoutProvisioning } from "@/lib/stripe/registration";
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

  const summary = await reconcilePendingCheckoutProvisioning(
    createAdminClient(),
  );

  return NextResponse.json(summary, {
    status: summary.failed > 0 ? 207 : 200,
  });
}
