import { NextResponse, type NextRequest } from "next/server";

import { getPublicBoardEvaluationSurvey } from "@/lib/board-evaluation/public-survey";
import { validateBoardEvaluationSubmission } from "@/lib/board-evaluation/validate-submission";
import { createAdminClient } from "@/utils/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest, {
  params,
}: { params: Promise<{ kind: string; token: string }> }) {
  const { kind, token } = await params;
  if (kind !== "annual" && kind !== "meeting") {
    return NextResponse.json({ error: "Survey not found." }, { status: 404, headers: noStore });
  }
  if (Number(request.headers.get("content-length") || 0) > 32_768) {
    return NextResponse.json({ error: "Response is too long." }, { status: 413, headers: noStore });
  }
  const survey = await getPublicBoardEvaluationSurvey(kind, token);
  if (!survey) return NextResponse.json({ error: "Survey not found." }, { status: 404, headers: noStore });
  if (!survey.open) return NextResponse.json({ error: "This survey is closed." }, { status: 409, headers: noStore });

  let payload: unknown;
  try {
    const body = await request.text();
    if (body.length > 32_768) {
      return NextResponse.json({ error: "Response is too long." }, { status: 413, headers: noStore });
    }
    payload = JSON.parse(body);
  }
  catch { return NextResponse.json({ error: "Check the response format." }, { status: 400, headers: noStore }); }
  const checked = validateBoardEvaluationSubmission(survey, payload);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400, headers: noStore });
  const admin = createAdminClient();
  if (kind === "annual") {
    const { error } = await admin.rpc("submit_board_evaluation_annual", {
      p_token: token, p_ratings: checked.ratings, p_open_ended: checked.openEnded,
    });
    if (error) return NextResponse.json({ error: "The response could not be saved. Please try again." }, { status: 500, headers: noStore });
  } else {
    const { error } = await admin.rpc("submit_board_evaluation_meeting", {
      p_token: token, p_ratings: checked.ratings, p_comment: checked.comment,
    });
    if (error) return NextResponse.json({ error: "The response could not be saved. Please try again." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
