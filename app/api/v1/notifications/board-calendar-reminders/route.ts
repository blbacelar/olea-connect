import { NextResponse } from "next/server";

import { processBoardCalendarReminders } from "@/lib/notifications/board-calendar-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const summary = await processBoardCalendarReminders({
      dryRun: url.searchParams.get("dryRun") === "1",
    });

    return NextResponse.json(summary, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Unable to process board calendar reminders", error);
    return NextResponse.json(
      { error: "Board calendar reminders could not be processed." },
      { headers: noStoreHeaders, status: 500 },
    );
  }
}

export const POST = GET;
