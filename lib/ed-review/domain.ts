import * as z from "zod";
import { getSourceSurveyDefinition } from "@/lib/ed-review/survey-source-content";

export const campaignKinds = ["staff", "partner"] as const;
export type EdReviewCampaignKind = (typeof campaignKinds)[number];

export const campaignStatuses = [
  "draft",
  "open",
  "closed",
  "archived",
] as const;
export type EdReviewCampaignStatus = (typeof campaignStatuses)[number];

export const reviewerRoles = [
  "board_chair",
  "hr_reviewer",
  "privileged_auditor",
] as const;
export type EdReviewReviewerRole = (typeof reviewerRoles)[number];

export type SurveyQuestion = {
  id: string;
  label: string;
  subtext?: string;
};

export type SurveySection = {
  id: string;
  commentId: string;
  label: string;
  description?: string;
  commentPrompt?: string;
  questions: readonly SurveyQuestion[];
};

export type SurveyDefinition = {
  kind: EdReviewCampaignKind;
  label: string;
  description: string;
  sections: readonly SurveySection[];
};

export type SurveyInstrumentVersion = 1 | 2;

const staffSections = [
  {
    id: "vision",
    commentId: "S1",
    label: "Vision and leadership",
    questions: [
      "Provides a clear and inspiring vision for the organization.",
      "Makes sound decisions during uncertainty.",
      "Sets priorities and adapts effectively when circumstances change.",
    ],
  },
  {
    id: "culture",
    commentId: "S2",
    label: "People and culture",
    questions: [
      "Creates a positive, inclusive work environment.",
      "Recognizes staff contributions and supports professional growth.",
      "Addresses issues fairly and models organizational values.",
    ],
  },
  {
    id: "communications",
    commentId: "S3",
    label: "Communications",
    questions: [
      "Shares timely, clear information.",
      "Is approachable and listens to staff perspectives.",
      "Communicates transparently about decisions and change.",
    ],
  },
  {
    id: "operations",
    commentId: "S4",
    label: "Operations and stewardship",
    questions: [
      "Is organized and follows through on commitments.",
      "Manages resources and budget responsibly.",
      "Builds systems that help the organization work effectively.",
    ],
  },
  {
    id: "innovation",
    commentId: "S5",
    label: "Innovation and learning",
    questions: [
      "Encourages creativity and continuous improvement.",
      "Takes thoughtful, calculated risks when appropriate.",
      "Helps the team turn learning into practical improvements.",
    ],
  },
  {
    id: "partnership",
    commentId: "S6",
    label: "Partnership and community",
    questions: [
      "Builds trust with partners and community members.",
      "Represents the organization effectively with external audiences.",
      "Makes meaningful space for community perspectives.",
    ],
  },
] as const;

const partnerSections = [
  {
    id: "relationship",
    commentId: "A",
    label: "Relationship and trust",
    questions: [
      "Builds genuine, productive relationships.",
      "Is reliable and follows through on commitments.",
      "Is professional, responsive, and easy to work with.",
      "Represents partner interests fairly.",
    ],
  },
  {
    id: "strategy",
    commentId: "B",
    label: "Strategic and external leadership",
    questions: [
      "Communicates the organization’s purpose and value clearly.",
      "Is credible and effective in the sector.",
      "Brings people together around shared priorities.",
      "Strengthens the broader nonprofit ecosystem.",
    ],
  },
  {
    id: "inclusion",
    commentId: "C",
    label: "Inclusion and responsiveness",
    questions: [
      "Creates an inclusive, respectful experience for partners.",
      "Responds thoughtfully to partner needs.",
      "Makes community voices feel genuinely valued.",
      "My organization or community is valued as a genuine partner.",
    ],
  },
  {
    id: "impact",
    commentId: "D",
    label: "Impact",
    questions: [
      "Encourages practical innovation.",
      "Helps the organization deliver meaningful outcomes.",
      "Would recommend working with the organization.",
    ],
  },
] as const;

function createSections(
  prefix: "staff" | "partner",
  source: readonly {
    id: string;
    commentId: string;
    label: string;
    questions: readonly string[];
  }[],
): SurveySection[] {
  return source.map((section) => ({
    id: section.id,
    commentId: section.commentId,
    label: section.label,
    questions: section.questions.map((label, index) => ({
      id:
        prefix === "staff"
          ? `${section.commentId}${String.fromCharCode(97 + index)}`
          : `${section.commentId}${index + 1}`,
      label,
    })),
  }));
}

export const surveyDefinitions: Record<EdReviewCampaignKind, SurveyDefinition> =
  {
    staff: {
      kind: "staff",
      label: "Staff feedback survey",
      description:
        "Your responses are anonymous. Please answer based on your experience working with the ED/CEO.",
      sections: createSections("staff", staffSections),
    },
    partner: {
      kind: "partner",
      label: "Partner and stakeholder feedback survey",
      description:
        "Your responses are anonymous. Please answer based on your experience working with the organization and its ED/CEO.",
      sections: createSections("partner", partnerSections),
    },
  };

export function getSurveyDefinition(
  kind: EdReviewCampaignKind,
  version: SurveyInstrumentVersion = 1,
) {
  return version === 2
    ? getSourceSurveyDefinition(kind, "en-CA")
    : surveyDefinitions[kind];
}

export function getQuestionIds(kind: EdReviewCampaignKind, version: SurveyInstrumentVersion = 1) {
  return getSurveyDefinition(kind, version).sections.flatMap((section) =>
    section.questions.map((question) => question.id),
  );
}

export function getCommentIds(kind: EdReviewCampaignKind, version: SurveyInstrumentVersion = 1) {
  return getSurveyDefinition(kind, version).sections.map((section) => section.commentId);
}

const ratingSchema = z.coerce.number().int().min(1).max(5);
const commentSchema = z.string().trim().max(2000);

export const anonymousSurveySubmissionSchema = z
  .object({
    kind: z.enum(campaignKinds),
    instrumentVersion: z.union([z.literal(1), z.literal(2)]).default(1),
    idempotencyKey: z.string().uuid(),
    ratings: z.record(z.string(), ratingSchema),
    comments: z.record(z.string(), commentSchema),
    overall: z
      .object({
        greatest_strength: commentSchema.default(""),
        important_change: commentSchema.default(""),
        additional_comments: commentSchema.default(""),
      })
      .strict(),
    meta: z.object({
      review_period: z.string().trim().max(9).refine(
        (value) => !value || /^\d{4}(?:[–-]\d{4})?$/.test(value),
        "Use YYYY or YYYY–YYYY for the review period.",
      ).optional(),
      reply_by: z.string().trim().max(10).refine(
        (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
        "Use a valid YYYY-MM-DD reply-by date.",
      ).optional(),
    }).strict().optional(),
    context: z.union([
      z.object({
        relationship_type: z.enum([
          "funder", "partner", "community_member", "other", "prefer_not_to_say",
        ]),
      }).strict(),
      z.object({
        sector_type: z.string().trim().max(80).optional(),
        engagement_length: z.string().trim().max(60).optional(),
        engagement_nature: z.string().trim().max(80).optional(),
      }).strict(),
    ]).optional(),
  })
  .strict();

export type AnonymousSurveySubmission = z.infer<
  typeof anonymousSurveySubmissionSchema
>;

export function validateAnonymousSurveySubmission(
  input: unknown,
): AnonymousSurveySubmission {
  const parsed = anonymousSurveySubmissionSchema.parse(input);
  const allowedQuestionIds = new Set(getQuestionIds(parsed.kind, parsed.instrumentVersion));
  const allowedCommentIds = new Set(getCommentIds(parsed.kind, parsed.instrumentVersion));

  for (const questionId of Object.keys(parsed.ratings)) {
    if (!allowedQuestionIds.has(questionId)) {
      throw new Error(
        "The survey response contains an unknown rating question.",
      );
    }
  }
  for (const questionId of Object.keys(parsed.comments)) {
    if (!allowedCommentIds.has(questionId)) {
      throw new Error(
        "The survey response contains an unknown comment question.",
      );
    }
  }
  if (!Object.keys(parsed.ratings).length) {
    throw new Error("Answer at least one rating before submitting the survey.");
  }
  if (parsed.kind === "staff" && parsed.context) {
    throw new Error("Staff survey responses cannot include partner context.");
  }
  if (parsed.context) {
    const legacy = "relationship_type" in parsed.context;
    if ((parsed.instrumentVersion === 1) !== legacy) {
      throw new Error("The survey context does not match the questionnaire version.");
    }
  }
  if (parsed.meta && parsed.instrumentVersion !== 2) {
    throw new Error("Review metadata requires the current questionnaire version.");
  }

  // Anonymous survey content must be de-identified before it reaches storage,
  // not only when it is later sent to an AI summarizer.
  return {
    ...parsed,
    context: parsed.context && parsed.instrumentVersion === 2
      ? Object.fromEntries(Object.entries(parsed.context).map(([key, value]) => [
          key, deidentifySurveyComment(value ?? ""),
        ])) as typeof parsed.context
      : parsed.context,
    meta: parsed.meta,
    comments: Object.fromEntries(
      Object.entries(parsed.comments).map(([id, comment]) => [
        id,
        deidentifySurveyComment(comment),
      ]),
    ),
    overall: {
      greatest_strength: deidentifySurveyComment(
        parsed.overall.greatest_strength,
      ),
      important_change: deidentifySurveyComment(
        parsed.overall.important_change,
      ),
      additional_comments: deidentifySurveyComment(
        parsed.overall.additional_comments,
      ),
    },
  };
}

export type SurveyResponseForAggregation = {
  answers: AnonymousSurveySubmission;
};

export type SurveyQuestionAverage = {
  questionId: string;
  average: number | null;
  responseCount: number;
  instrumentVersion?: SurveyInstrumentVersion;
};

export type SurveySectionAverage = {
  sectionId: string;
  sectionLabel: string;
  average: number | null;
  responseCount: number;
  instrumentVersion?: SurveyInstrumentVersion;
};

export type SurveyAggregate = {
  responseCount: number;
  questionAverages: SurveyQuestionAverage[];
  sectionAverages: SurveySectionAverage[];
  deidentifiedComments: string[];
};

function roundedAverage(values: number[]) {
  if (!values.length) return null;
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
    ) / 100
  );
}

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const urlPattern = /\b(?:https?:\/\/|www\.)\S+/gi;
const phonePattern = /(?:\+?\d[\d().\-\s]{6,}\d)/g;
// Match two- and three-word title-cased names. Being slightly over-inclusive
// is intentional: anonymous survey comments should never leave the system
// with a possible personal identifier for an AI summarizer.
const fullNamePattern = /\b(?:[A-Z][a-z]{1,30}\s+){1,2}[A-Z][a-z]{1,30}\b/g;

/** Removes the most common direct identifiers before comments leave Olea. */
export function deidentifySurveyComment(value: string) {
  return value
    .replace(emailPattern, "[email removed]")
    .replace(urlPattern, "[link removed]")
    .replace(phonePattern, "[phone removed]")
    .replace(fullNamePattern, "[name removed]")
    .trim();
}

export function aggregateSurveyResponses(
  kind: EdReviewCampaignKind,
  responses: readonly SurveyResponseForAggregation[],
): SurveyAggregate {
  const versions = ([1, 2] as const).filter((version) =>
    responses.some((response) => (response.answers.instrumentVersion ?? 1) === version),
  );
  // Empty campaigns still expose the current questionnaire structure.
  if (!versions.length) versions.push(2);
  const mixed = versions.length > 1;
  const questionAverages: SurveyQuestionAverage[] = [];
  const sectionAverages: SurveySectionAverage[] = [];
  for (const version of versions) {
    const definition = getSurveyDefinition(kind, version);
    const sameVersion = responses.filter(
      (response) => (response.answers.instrumentVersion ?? 1) === version,
    );
    for (const section of definition.sections) {
      const sectionValues: number[] = [];
      for (const question of section.questions) {
        const values = sameVersion
          .map((response) => response.answers.ratings[question.id])
          .filter((value): value is number => typeof value === "number");
        sectionValues.push(...values);
        questionAverages.push({
          questionId: mixed ? `v${version}:${question.id}` : question.id,
          average: roundedAverage(values),
          responseCount: values.length,
          instrumentVersion: version,
        });
      }
      sectionAverages.push({
        sectionId: mixed ? `v${version}:${section.id}` : section.id,
        sectionLabel: mixed
          ? `${version === 1 ? "Previous agreement scale" : "HTML performance scale"} · ${section.label}`
          : section.label,
        average: roundedAverage(sectionValues),
        responseCount: sectionValues.length,
        instrumentVersion: version,
      });
    }
  }

  const deidentifiedComments = responses.flatMap((response) => {
    const freeText = [
      ...Object.values(response.answers.comments),
      ...Object.values(response.answers.overall),
    ];
    return freeText
      .map(deidentifySurveyComment)
      .filter((comment) => comment.length > 0);
  });

  return {
    responseCount: responses.length,
    questionAverages,
    sectionAverages,
    deidentifiedComments,
  };
}

export type SurveyFinding = {
  title: string;
  detail: string;
};

export const compilationSummarySchema = z.object({
  executive_summary: z.string().trim().min(1).max(2000),
  strengths: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        detail: z.string().trim().min(1).max(800),
      }),
    )
    .max(8),
  growth_opportunities: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        detail: z.string().trim().min(1).max(800),
      }),
    )
    .max(8),
  cross_cutting_themes: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        detail: z.string().trim().min(1).max(800),
      }),
    )
    .max(8),
  recommended_discussion_questions: z
    .array(z.string().trim().min(1).max(500))
    .max(8),
});

export type CompilationSummary = z.infer<typeof compilationSummarySchema>;

export function calculateMeaningfulGaps(
  sections: readonly SurveySectionAverage[],
  threshold = 0.7,
) {
  return ([1, 2] as const).flatMap((version) => {
    const scored = sections.filter(
      (section): section is SurveySectionAverage & { average: number } =>
        (section.instrumentVersion ?? 1) === version && section.average !== null,
    );
    if (scored.length < 2) return [];
    const top = Math.max(...scored.map((section) => section.average));
    return scored.filter((section) => top - section.average >= threshold);
  });
}
