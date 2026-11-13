import * as z from "zod";

import annualSections from "./annual-questions.json";
import meetingGroups from "./meeting-questions.json";
import openQuestions from "./open-questions.json";

export const annualBoardSections = annualSections.map((section) => ({
  ...section,
  questions: section.qs.map((label, index) => ({
    id: `s${section.num}q${index}`,
    label,
  })),
}));

export const annualBoardOpenQuestions = openQuestions.map((label, index) => ({
  id: String(index),
  label,
}));

export const meetingEvaluationGroups = meetingGroups.map((group, groupIndex) => ({
  ...group,
  questions: group.qs.map((label, index) => ({
    id: `g${groupIndex}q${index}`,
    label,
  })),
}));

const annualQuestionIds = new Set(annualBoardSections.flatMap((section) =>
  section.questions.map((question) => question.id)));
const meetingQuestionIds = new Set(meetingEvaluationGroups.flatMap((group) =>
  group.questions.map((question) => question.id)));

const rating = z.union([z.number().int().min(1).max(5), z.literal("na")]);
const annualSubmissionSchema = z.object({
  ratings: z.record(z.string(), rating),
  openEnded: z.record(z.string(), z.string().trim().max(2000)),
}).strict();

const meetingSubmissionSchema = z.object({
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  comment: z.string().trim().max(2000),
}).strict();

export type AnnualBoardSubmission = z.infer<typeof annualSubmissionSchema>;
export type MeetingEvaluationSubmission = z.infer<typeof meetingSubmissionSchema>;

export function parseAnnualBoardSubmission(value: unknown): AnnualBoardSubmission {
  const submission = annualSubmissionSchema.parse(value);
  if (!Object.keys(submission.ratings).length) {
    throw new Error("Select at least one rating before submitting.");
  }
  for (const id of Object.keys(submission.ratings)) {
    if (!annualQuestionIds.has(id)) throw new Error("Unknown annual survey question.");
  }
  for (const id of Object.keys(submission.openEnded)) {
    if (!annualBoardOpenQuestions.some((question) => question.id === id)) {
      throw new Error("Unknown annual open question.");
    }
  }
  return submission;
}

export function parseMeetingEvaluationSubmission(value: unknown): MeetingEvaluationSubmission {
  const submission = meetingSubmissionSchema.parse(value);
  if (!Object.keys(submission.ratings).length) {
    throw new Error("Select at least one rating before submitting.");
  }
  for (const id of Object.keys(submission.ratings)) {
    if (!meetingQuestionIds.has(id)) throw new Error("Unknown meeting survey question.");
  }
  return submission;
}

export type BoardEvaluationFlag =
  | "strength" | "satisfactory" | "improvement" | "concern" | "no_data";

export function getBoardEvaluationFlag(average: number | null): BoardEvaluationFlag {
  if (average === null) return "no_data";
  if (average >= 4.5) return "strength";
  if (average >= 3.5) return "satisfactory";
  if (average >= 3) return "improvement";
  return "concern";
}

export function getBoardEvaluationTrend(current: number | null, prior: number | null) {
  if (current === null || prior === null) return "no_data" as const;
  const difference = current - prior;
  if (difference >= 0.3 - 1e-9) return "up" as const;
  if (difference <= -0.3 + 1e-9) return "down" as const;
  return "flat" as const;
}

export function getBoardEvaluationResponseRate(received: number, invited: number) {
  if (!Number.isInteger(received) || received < 0 || !Number.isInteger(invited) || invited < 0) {
    throw new Error("Response counts must be nonnegative whole numbers.");
  }
  return invited ? Math.round(received / invited * 100) : null;
}

export function getMeetingEvaluationAssessment(average: number | null) {
  if (average === null) return "no_data" as const;
  if (average >= 4) return "strong" as const;
  if (average >= 3) return "satisfactory" as const;
  if (average >= 2) return "below_expectations" as const;
  return "poor" as const;
}

export function aggregateAnnualQuestion(
  responses: AnnualBoardSubmission[],
  questionId: string,
  boardSize: number,
) {
  if (!annualQuestionIds.has(questionId)) throw new Error("Unknown annual survey question.");
  const scores = responses.map((response) => response.ratings[questionId])
    .filter((value): value is number => typeof value === "number");
  const suppressed = scores.length < 5;
  const average = suppressed ? null :
    Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) / 10;
  const distribution = boardSize < 8 || suppressed ? null :
    [1, 2, 3, 4, 5].map((score) => scores.filter((value) => value === score).length);
  return { responseCount: scores.length, average, distribution, suppressed };
}
