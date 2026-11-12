import { isRating } from "./prototype-domain";

type SurveyKind = "annual" | "meeting";
type SurveySelection = { kind: SurveyKind; selectedRated: string[]; selectedOpen: string[] };
type Result =
  | { ok: true; ratings: Record<string, unknown>; openEnded: Record<string, string>; comment: string }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateBoardEvaluationSubmission(survey: SurveySelection, payload: unknown): Result {
  if (!isObject(payload) || !isObject(payload.ratings)) {
    return { ok: false, error: "Check the response format." };
  }
  const allowed = new Set(survey.selectedRated);
  const ratings = payload.ratings;
  if (Object.keys(ratings).some((key) => !allowed.has(key)) ||
      Object.values(ratings).some((rating) => !isRating(rating) && !(survey.kind === "annual" && rating === "na"))) {
    return { ok: false, error: "Choose a valid rating for each answered question." };
  }
  if (survey.kind === "annual") {
    const openEnded = payload.openEnded;
    const allowedOpen = new Set(survey.selectedOpen);
    if (!isObject(openEnded) || Object.keys(openEnded).some((key) => !allowedOpen.has(key)) ||
      Object.values(openEnded).some((answer) => typeof answer !== "string" || answer.length > 4000)) {
      return { ok: false, error: "Check the open answers; each can use up to 4,000 characters." };
    }
    return { ok: true, ratings, openEnded: openEnded as Record<string, string>, comment: "" };
  }
  if (typeof payload.comment !== "string" || payload.comment.length > 4000) {
    return { ok: false, error: "The optional comment can use up to 4,000 characters." };
  }
  return { ok: true, ratings, openEnded: {}, comment: payload.comment };
}
