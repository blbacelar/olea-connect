import type { StakeholderQuestion } from "./stakeholder-survey";

export function mergeStakeholderSummary(current: string, block: string) {
  const marker = "From our stakeholder survey (";
  const start = current.indexOf(marker);
  if (start < 0) return [current.trimEnd(), block].filter(Boolean).join("\n\n");
  const end = current.indexOf("\n\n", start);
  return `${current.slice(0, start)}${block}${end >= 0 ? current.slice(end) : ""}`;
}

export type StakeholderQuestionResult = {
  id: string;
  text: string;
  type: StakeholderQuestion["type"];
  answered: number;
  average: number | null;
  options: Array<{ label: string; count: number }>;
  comments: string[];
};

export function aggregateStakeholderResults(
  questions: StakeholderQuestion[],
  responses: Array<Record<string, string | string[]>>,
  minimumResponses = 5,
): StakeholderQuestionResult[] {
  if (responses.length < minimumResponses) return [];
  return questions.map((question) => {
    const answers = responses.map((response) => response[question.id]).filter((answer) =>
      typeof answer === "string" ? Boolean(answer.trim()) : Array.isArray(answer) && answer.length > 0);
    const ratings = answers.filter((answer): answer is string => typeof answer === "string")
      .map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
    const optionCounts = question.options.map((label) => ({ label, count: answers.filter((answer) =>
      Array.isArray(answer) ? answer.includes(label) : answer === label).length }));
    return { id: question.id, text: question.text, type: question.type, answered: answers.length,
      average: ["agree", "rating"].includes(question.type) && ratings.length >= minimumResponses
        ? Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length * 10) / 10 : null,
      options: optionCounts,
      comments: question.type === "open" ? answers.filter((answer): answer is string =>
        typeof answer === "string").map((answer) => answer.trim()) : [],
    };
  });
}
