import { surveySections } from "@/lib/survey-content";
import type { SurveyScore } from "@/lib/types";

export function calculateSectionAverages(
  answers: Record<number, SurveyScore>,
) {
  return surveySections.map((section) => {
    const scores = section.questions.flatMap((question) => {
      const score = answers[question.id];
      return typeof score === "number" ? [score] : [];
    });

    return {
      id: section.id,
      title: section.title,
      average:
        scores.length > 0
          ? scores.reduce((total, score) => total + score, 0) / scores.length
          : null,
    };
  });
}

export function countCompletedSurveyAnswers(
  answers: Record<number, SurveyScore>,
) {
  return Object.values(answers).filter((answer) => answer !== undefined).length;
}
