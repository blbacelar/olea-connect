export const evaluationQuestions = [
  { id: "mission", en: "Mission and strategic direction", fr: "Mission et orientation stratégique" },
  { id: "roles", en: "Clear director roles and responsibilities", fr: "Rôles et responsabilités clairs des administrateurs" },
  { id: "meetings", en: "Effective meetings and decisions", fr: "Réunions et décisions efficaces" },
  { id: "financial", en: "Financial oversight", fr: "Surveillance financière" },
  { id: "risk", en: "Risk and policy oversight", fr: "Surveillance des risques et des politiques" },
  { id: "leadership", en: "Support and evaluation of the executive leader", fr: "Soutien et évaluation de la direction générale" },
  { id: "succession", en: "Recruitment and succession planning", fr: "Recrutement et planification de la relève" },
  { id: "inclusion", en: "Inclusive participation and diverse perspectives", fr: "Participation inclusive et diversité des perspectives" },
  { id: "learning", en: "Ongoing learning and improvement", fr: "Apprentissage et amélioration continus" },
] as const;

export type EvaluationQuestionId = typeof evaluationQuestions[number]["id"];
export type EvaluationScores = Record<EvaluationQuestionId, number>;

export const minimumEvaluationResponses = 3;

export function nextAvailableEvaluationYear(existingYears: number[], currentYear: number): number | null {
  const usedYears = new Set(existingYears);
  for (let year = Math.max(2000, currentYear); year <= 2100; year += 1) {
    if (!usedYears.has(year)) return year;
  }
  return null;
}

export function canCloseBoardEvaluation(responseCount: number) {
  return responseCount >= minimumEvaluationResponses;
}

export function canShowBoardEvaluationResults(status: string, responseCount: number) {
  return status === "closed" && canCloseBoardEvaluation(responseCount);
}

export function canManageBoardEvaluationActions(status: string) {
  return status === "closed";
}

export function parseEvaluationScores(values: Record<string, unknown>): EvaluationScores {
  const result = {} as EvaluationScores;
  for (const question of evaluationQuestions) {
    const value = Number(values[question.id]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error(`Choose a rating from 1 to 5 for ${question.en}.`);
    }
    result[question.id] = value;
  }
  return result;
}

export function aggregateEvaluationScores(responses: EvaluationScores[]) {
  return evaluationQuestions.map((question) => {
    const total = responses.reduce((sum, scores) => sum + scores[question.id], 0);
    return {
      id: question.id,
      en: question.en,
      fr: question.fr,
      average: responses.length ? Math.round((total / responses.length) * 10) / 10 : null,
    };
  });
}
