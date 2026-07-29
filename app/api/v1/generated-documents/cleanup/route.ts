import { NextResponse } from "next/server";

import { cleanupGeneratedDocuments } from "@/lib/generated-documents/cleanup";

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

  try {
    const url = new URL(request.url);
    const summary = await cleanupGeneratedDocuments({
      dryRun: url.searchParams.get("dryRun") === "1",
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Unable to clean generated documents", error);
    return NextResponse.json(
      { error: "Generated document cleanup failed." },
      { status: 500 },
    );
  }
}
