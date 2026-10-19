import { NextResponse } from "next/server";

import { logError } from "@/lib/observability/logger";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { headers, status: 401 });
  }

  try {
    const { data, error } = await createAdminClient().rpc("expire_sponsored_memberships");
    if (error) throw error;
    return NextResponse.json({ expired: data ?? 0 }, { headers });
  } catch (error) {
    logError("Unable to expire sponsored memberships", error);
    return NextResponse.json(
      { error: "Sponsored memberships could not be expired." },
      { headers, status: 500 },
    );
  }
}
