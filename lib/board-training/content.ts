import "server-only";

import chairEn from "@/content/training/chair.en.json";
import chairFr from "@/content/training/chair.fr.json";
import essentialsEn from "@/content/training/essentials.en.course.json";
import essentialsFr from "@/content/training/essentials.fr.course.json";
import essentialsQuizEn from "@/content/training/essentials.en.quiz.json";
import essentialsQuizFr from "@/content/training/essentials.fr.quiz.json";
import refresherEn from "@/content/training/refresher.en.course.json";
import refresherFr from "@/content/training/refresher.fr.course.json";
import refresherQuizEn from "@/content/training/refresher.en.quiz.json";
import refresherQuizFr from "@/content/training/refresher.fr.quiz.json";

export type TrainingCourseId = "essentials" | "refresher";
export type TrainingLanguage = "en" | "fr";

export type TrainingBlock =
  | { type: "text"; body: string }
  | { type: "keypoints" | "questions"; title: string; items: string[] }
  | { type: "callout"; title: string; body: string; variant?: string }
  | { type: "takeaway"; body: string }
  | { type: "jurisdiction"; title: string; variants: Record<string, string[]> }
  | { type: "scenario"; title: string; situation: string; question: string; debrief: string; choices: Array<{ id: string; text: string; outcome: string; best: boolean }> };

export type TrainingCourse = {
  id: string;
  title: string;
  subtitle: string;
  currentAsOf: string;
  estimatedMinutes: number;
  passMarkPercent: number;
  certificateValidMonths: number;
  jurisdictionNote: string;
  jurisdictions?: Array<{ id: string; label: string; act: string }>;
  welcome: { heading: string; body: string[]; outcomes: string[] };
  testOut: { enabled: boolean; heading?: string; body?: string; button?: string };
  lessons: Array<{ id: string; number: number; title: string; minutes: number; blocks: TrainingBlock[] }>;
  orgLesson: {
    id: string; title: string; intro: string; readingTip?: string;
    documentsHeading?: string; noDocuments?: string; documentKinds?: Record<string, string>;
    reviewedLabel?: string; mode?: string;
    coi: { heading: string; intro: string; noneLabel: string; listLabel: string; placeholder: string; commitment?: string };
    conduct: { heading: string; statement: string; missing: string };
    signatureLabel: string; button: string;
  };
  attestation: { heading: string; statements: string[] };
  closing: { heading: string; body: string };
  media: { welcomeVideo: { url: string | null; title: string; pending: string }; lessonAudio: Record<string, string> };
  reflection?: { before: { heading: string; intro: string; button: string }; after: { heading: string; intro: string }; scale: string[]; topics: Array<{ id: string; label: string }> };
  actionPlan?: { heading: string; intro: string; suggestions: string[]; customLabel: string; customPlaceholder: string; max: number; button: string; previous: { heading: string; intro: string; statuses: Record<string, string> } };
};

export type TrainingQuestion = {
  id: string;
  lesson: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  answer: string;
  explanation: string;
};

type TrainingQuiz = { passMarkPercent: number; questions: TrainingQuestion[] };

const courses = {
  essentials: { en: essentialsEn, fr: essentialsFr },
  refresher: { en: refresherEn, fr: refresherFr },
} as const;

// Quiz keys stay in this server-only module. Client components receive only
// question text and options through getPublicQuestions.
const quizzes = {
  essentials: { en: essentialsQuizEn, fr: essentialsQuizFr },
  refresher: { en: refresherQuizEn, fr: refresherQuizFr },
} as const;

export function getTrainingCourse(courseId: TrainingCourseId, language: TrainingLanguage) {
  return courses[courseId][language] as TrainingCourse;
}

export function getTrainingQuiz(courseId: TrainingCourseId, language: TrainingLanguage) {
  return quizzes[courseId][language] as TrainingQuiz;
}

export function getPublicQuestions(courseId: TrainingCourseId, language: TrainingLanguage) {
  return getTrainingQuiz(courseId, language).questions.map(({ id, lesson, prompt, options }) => ({
    id, lesson, prompt, options,
  }));
}

export function getChairGuide(language: TrainingLanguage) {
  return (language === "fr" ? chairFr : chairEn) as {
    title: string; subtitle: string; currentAsOf: string; intro: string[];
    howTo: { heading: string; items: string[] };
    sessions: Array<{ id: string; title: string; minutes: number; when: string; purpose: string; opener: string; questions: string[]; tip: string }>;
    capture: { heading: string; intro: string; fields: string[] };
  };
}
