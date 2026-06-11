"use client";

import { useMemo, useState } from "react";

import { surveySections } from "@/lib/survey-content";
import type { SurveyScore, TemplateSession } from "@/lib/types";

export function useSurveySession(initialSession: TemplateSession) {
  const [session, setSession] = useState(initialSession);

  const updateField = <K extends keyof TemplateSession>(
    field: K,
    value: TemplateSession[K],
  ) => {
    setSession((current) => ({ ...current, [field]: value }));
  };

  const updateScore = (questionId: number, score: SurveyScore) => {
    setSession((current) => ({
      ...current,
      answers: { ...current.answers, [questionId]: score },
    }));
  };

  const updateOpenAnswer = (questionId: string, answer: string) => {
    setSession((current) => ({
      ...current,
      openEndedAnswers: {
        ...current.openEndedAnswers,
        [questionId]: answer,
      },
    }));
  };

  const sectionAverages = useMemo(
    () =>
      surveySections.map((section) => {
        const scores = section.questions.flatMap((question) => {
          const score = session.answers[question.id];
          return typeof score === "number" ? [score] : [];
        });
        return {
          id: section.id,
          title: section.title,
          average:
            scores.length > 0
              ? scores.reduce((total, score) => total + score, 0) /
                scores.length
              : null,
        };
      }),
    [session.answers],
  );

  const completedCount = Object.values(session.answers).filter(
    (answer) => answer !== undefined,
  ).length;

  return {
    session,
    updateField,
    updateScore,
    updateOpenAnswer,
    sectionAverages,
    completedCount,
  };
}
