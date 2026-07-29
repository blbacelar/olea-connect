"use client";

import { useMemo, useState } from "react";

import {
  calculateSectionAverages,
  countCompletedSurveyAnswers,
} from "@/lib/survey-domain";
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
    () => calculateSectionAverages(session.answers),
    [session.answers],
  );

  const completedCount = countCompletedSurveyAnswers(session.answers);

  return {
    session,
    updateField,
    updateScore,
    updateOpenAnswer,
    sectionAverages,
    completedCount,
  };
}
