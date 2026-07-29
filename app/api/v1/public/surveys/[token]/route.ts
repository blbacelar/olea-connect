import { NextResponse } from "next/server";

import {
  getPublicEdReviewCampaign,
  submitEdReviewResponse,
} from "@/lib/data/ed-review";
import { validateAnonymousSurveySubmission } from "@/lib/ed-review/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
};

function unavailable() {
  return NextResponse.json(
    { error: "This survey link is unavailable." },
    { headers: noStoreHeaders, status: 404 },
  );
}

function hasAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const campaign = await getPublicEdReviewCampaign(params.token);
  if (!campaign) return unavailable();
  return NextResponse.json(campaign, { headers: noStoreHeaders });
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid survey request." },
      { headers: noStoreHeaders, status: 403 },
    );
  }
  if (Number(request.headers.get("content-length") ?? 0) > 65_536) {
    return NextResponse.json(
      { error: "The survey response is too large." },
      { headers: noStoreHeaders, status: 413 },
    );
  }
  const campaign = await getPublicEdReviewCampaign(params.token);
  if (!campaign) return unavailable();

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 65_536) {
      return NextResponse.json(
        { error: "The survey response is too large." },
        { headers: noStoreHeaders, status: 413 },
      );
    }
    const body = JSON.parse(rawBody) as unknown;
    if (!body || Array.isArray(body) || typeof body !== "object") {
      throw new Error("Invalid survey body.");
    }
    const answers = validateAnonymousSurveySubmission({
      ...(body as Record<string, unknown>),
      kind: campaign.kind,
    });
    await submitEdReviewResponse({ token: params.token, answers });
    return NextResponse.json(
      { submitted: true },
      { headers: noStoreHeaders, status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not submit the survey. Check your answers and try again.",
      },
      { headers: noStoreHeaders, status: 400 },
    );
  }
}
