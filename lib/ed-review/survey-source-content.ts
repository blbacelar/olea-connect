import english from "@/lib/ed-review/survey-source-content.en.json";
import french from "@/lib/ed-review/survey-source-content.fr.json";
import type { Locale } from "@/lib/i18n/locales";

export type SourceSurveyKind = "staff" | "partner";

export type SourceSurveyQuestion = {
  id: string;
  sourceId: string;
  label: string;
  subtext: string;
};

export type SourceSurveySection = {
  id: string;
  sourceId: string;
  commentId: string;
  label: string;
  description: string;
  commentPrompt: string;
  questions: SourceSurveyQuestion[];
};

export type SourceSurveyContent = {
  kind: SourceSurveyKind;
  label: string;
  eyebrow: string;
  title: string;
  organizationPlaceholder: string;
  reviewPeriodLabel: string;
  reviewPeriodPlaceholder: string;
  deadlineLabel: string;
  deadlinePlaceholder: string;
  anonymousLabel: string;
  durationLabel: string;
  summaryLabel: string;
  description: string;
  commentPlaceholder: string;
  ratingScale: { value: number; label: string; description: string }[];
  overallTitle: string;
  closingTitle: string;
  closingDescription: string;
  footerNotice: string;
  overallPrompts: {
    greatestStrength: string;
    importantChange: string;
    additionalComments: string;
  };
  context?: {
    title: string;
    sectorTypeLabel: string;
    sectorTypePlaceholder: string;
    lengthLabel: string;
    lengthPlaceholder: string;
    natureLabel: string;
    naturePlaceholder: string;
  };
  sections: SourceSurveySection[];
};

export const sourceSurveyContent = {
  "en-CA": english,
  "fr-CA": french,
} as Record<Locale, Record<SourceSurveyKind, SourceSurveyContent>>;

export function getSourceSurveyContent(kind: SourceSurveyKind, locale: Locale) {
  return sourceSurveyContent[locale][kind];
}

export const getSourceSurveyDefinition = getSourceSurveyContent;
