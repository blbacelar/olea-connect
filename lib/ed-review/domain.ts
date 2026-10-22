import * as z from "zod";

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
};

export type SurveySection = {
  id: string;
  commentId: string;
  label: string;
  questions: readonly SurveyQuestion[];
};

export type SurveyDefinition = {
  kind: EdReviewCampaignKind;
  label: string;
  description: string;
  sections: readonly SurveySection[];
};

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

export function getSurveyDefinition(kind: EdReviewCampaignKind) {
  return surveyDefinitions[kind];
}

export function getQuestionIds(kind: EdReviewCampaignKind) {
  return getSurveyDefinition(kind).sections.flatMap((section) =>
    section.questions.map((question) => question.id),
  );
}

export function getCommentIds(kind: EdReviewCampaignKind) {
  return getSurveyDefinition(kind).sections.map((section) => section.commentId);
}

const ratingSchema = z.coerce.number().int().min(1).max(5);
const commentSchema = z.string().trim().max(2000);

export const anonymousSurveySubmissionSchema = z
  .object({
    kind: z.enum(campaignKinds),
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
    context: z
      .object({
        relationship_type: z.enum([
          "funder",
          "partner",
          "community_member",
          "other",
          "prefer_not_to_say",
        ]),
      })
      .strict()
      .optional(),
  })
  .strict();

export type AnonymousSurveySubmission = z.infer<
  typeof anonymousSurveySubmissionSchema
>;

export function validateAnonymousSurveySubmission(
  input: unknown,
): AnonymousSurveySubmission {
  const parsed = anonymousSurveySubmissionSchema.parse(input);
  const allowedQuestionIds = new Set(getQuestionIds(parsed.kind));
  const allowedCommentIds = new Set(getCommentIds(parsed.kind));

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

  // Anonymous survey content must be de-identified before it reaches storage,
  // not only when it is later sent to an AI summarizer.
  return {
    ...parsed,
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
};

export type SurveySectionAverage = {
  sectionId: string;
  sectionLabel: string;
  average: number | null;
  responseCount: number;
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
  const definition = getSurveyDefinition(kind);
  const questionAverages = definition.sections.flatMap((section) =>
    section.questions.map((question) => {
      const values = responses
        .map((response) => response.answers.ratings[question.id])
        .filter((value): value is number => typeof value === "number");
      return {
        questionId: question.id,
        average: roundedAverage(values),
        responseCount: values.length,
      };
    }),
  );
  const averageByQuestionId = new Map(
    questionAverages.map((average) => [average.questionId, average]),
  );
  const sectionAverages = definition.sections.map((section) => {
    const sectionValues = section.questions.flatMap((question) =>
      responses
        .map((response) => response.answers.ratings[question.id])
        .filter((value): value is number => typeof value === "number"),
    );
    return {
      sectionId: section.id,
      sectionLabel: section.label,
      average: roundedAverage(sectionValues),
      responseCount: section.questions.reduce(
        (count, question) =>
          count + (averageByQuestionId.get(question.id)?.responseCount ?? 0),
        0,
      ),
    };
  });

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
  const scored = sections.filter(
    (section): section is SurveySectionAverage & { average: number } =>
      section.average !== null,
  );
  if (scored.length < 2) return [];

  const top = Math.max(...scored.map((section) => section.average));
  return scored.filter((section) => top - section.average >= threshold);
}
