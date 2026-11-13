import { annualSurveySections, meetingSurveyGroups } from "./prototype-content";
import { meetingBank, ratedBank } from "./question-bank";

export type Rating = 1 | 2 | 3 | 4 | 5;
export type AnnualRating = Rating | "na";
export type ScoreFlag = "strength" | "satisfactory" | "improve" | "concern";

export const annualQuestions = annualSurveySections.flatMap((section) =>
  section.qs.map((text, index) => ({
    id: `s${section.num}q${index}`,
    sectionNumber: section.num,
    sectionName: section.name,
    text,
  })),
);

export const meetingQuestions = meetingSurveyGroups.flatMap((group, groupIndex) =>
  group.qs.map((text, index) => ({
    id: `g${groupIndex}q${index}`,
    groupIndex,
    groupName: group.name,
    text,
  })),
);

const bankSectionNumber = (category: string) => {
  if (category.startsWith("Risk")) return 8;
  if (category.startsWith("Community")) return 9;
  return [...new Set<string>(ratedBank.map((question) => question.category))].indexOf(category) + 1;
};

export function isRating(value: unknown): value is Rating {
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= 5;
}

export function scoreFlag(average: number): ScoreFlag {
  if (average >= 4.5) return "strength";
  if (average >= 3.5) return "satisfactory";
  if (average >= 3) return "improve";
  return "concern";
}

export function scoreTrend(current: number, previous: number | null): "up" | "down" | "stable" | "new" {
  if (previous === null) return "new";
  const difference = Math.round((current - previous) * 100) / 100;
  if (difference >= 0.3) return "up";
  if (difference <= -0.3) return "down";
  return "stable";
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/** Never returns response rows or open text. Results are grouped before leaving the server. */
export function aggregateAnnualResponses({
  responses,
  invited,
  previousSectionScores = {},
  selectedQuestionIds,
}: {
  responses: Array<Record<string, unknown>>;
  invited: number;
  previousSectionScores?: Record<string, number>;
  selectedQuestionIds?: string[];
}) {
  const smallBoard = invited < 8;
  const questionPool = selectedQuestionIds?.some((id) => id.startsWith("b"))
    ? ratedBank.map((question) => ({ id: question.id, sectionNumber: bankSectionNumber(question.category) }))
    : annualQuestions;
  const selected = selectedQuestionIds ? new Set(selectedQuestionIds) : null;
  const questions = questionPool.filter((question) => !selected || selected.has(question.id)).map((question) => {
    const values = responses.map((response) => response[question.id]).filter(isRating);
    const visible = values.length >= 5;
    const mean = visible ? average(values) : null;
    return {
      id: question.id,
      sectionNumber: question.sectionNumber,
      count: visible ? values.length : null,
      average: mean,
      percentPositive: visible ? Math.round(values.filter((value) => value >= 4).length / values.length * 100) : null,
      distribution: visible && !smallBoard
        ? [1, 2, 3, 4, 5].map((rating) => values.filter((value) => value === rating).length)
        : null,
      suppressed: !visible,
    };
  });
  const sections = annualSurveySections.map((section) => {
    const sectionQuestionIds = new Set(questionPool.filter((question) => question.sectionNumber === section.num).map((question) => question.id));
    const visibleScores = questions.filter((question) => sectionQuestionIds.has(question.id) && question.average !== null).map((question) => question.average!);
    const mean = average(visibleScores);
    const sectionResponses = responses.filter((response) => [...sectionQuestionIds].some((id) => isRating(response[id])));
    const visibleQuestionIds = questions.filter((question) => sectionQuestionIds.has(question.id) && !question.suppressed).map((question) => question.id);
    const ratings = sectionResponses.flatMap((response) => visibleQuestionIds
      .map((id) => response[id]).filter(isRating));
    const previous = previousSectionScores[String(section.num)] ?? null;
    return {
      number: section.num,
      name: section.name,
      average: mean,
      responseCount: sectionResponses.length,
      percentPositive: sectionResponses.length >= 5 && ratings.length
        ? Math.round(ratings.filter((rating) => rating >= 4).length / ratings.length * 100) : null,
      flag: mean === null ? null : scoreFlag(mean),
      trend: mean === null ? "new" as const : scoreTrend(mean, previous),
      persistentConcern: mean !== null && previous !== null && mean < 3.5 && previous < 3.5,
    };
  });
  const allRatings = responses.flatMap((response) => questions.filter((question) => !question.suppressed)
    .map((question) => response[question.id]).filter(isRating));
  return {
    received: responses.length,
    invited,
    responseRate: invited > 0 ? Math.round(responses.length / invited * 100) : null,
    overallPositivePercent: responses.length >= 5 && allRatings.length
      ? Math.round(allRatings.filter((rating) => rating >= 4).length / allRatings.length * 100) : null,
    smallBoard,
    questions,
    sections,
    overallAverage: average(sections.map((section) => section.average).filter((value): value is number => value !== null)),
  };
}

export function aggregateMeetingResponses(responses: Array<Record<string, unknown>>, selectedQuestionIds?: string[]) {
  const questionPool = selectedQuestionIds?.some((id) => id.startsWith("m"))
    ? meetingBank.map((question, index) => ({ id: question.id, groupIndex: index }))
    : meetingQuestions;
  const selected = selectedQuestionIds ? new Set(selectedQuestionIds) : null;
  return questionPool.filter((question) => !selected || selected.has(question.id)).map((question) => {
    const values = responses.map((response) => response[question.id]).filter(isRating);
    const mean = values.length >= 5 ? average(values) : null;
    return {
      id: question.id,
      groupIndex: question.groupIndex,
      average: mean,
      assessment: mean === null ? null : mean >= 4 ? "strong" : mean >= 3 ? "satisfactory" : mean >= 2 ? "below_expectations" : "poor",
      specificConcern: mean !== null && mean < 2.5,
      suppressed: mean === null,
    };
  });
}
