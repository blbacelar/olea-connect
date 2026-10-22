import { describe, expect, it } from "vitest";

import {
  aggregateSurveyResponses,
  calculateMeaningfulGaps,
  deidentifySurveyComment,
  getQuestionIds,
  validateAnonymousSurveySubmission,
} from "@/lib/ed-review/domain";

describe("anonymous ED review survey domain", () => {
  const base = {
    kind: "staff" as const,
    idempotencyKey: "f7fa3f21-cc69-4c6b-9179-a07a535c3aa7",
    ratings: { S1a: 5, S1b: 3 },
    comments: { S1: "A thoughtful leader." },
    overall: {
      greatest_strength: "Clarity",
      important_change: "More delegation",
      additional_comments: "",
    },
  };

  it("accepts valid anonymous staff feedback without an identity field", () => {
    expect(validateAnonymousSurveySubmission(base)).toMatchObject({
      kind: "staff",
      ratings: base.ratings,
    });
  });

  it("rejects a response without ratings", () => {
    expect(() =>
      validateAnonymousSurveySubmission({ ...base, ratings: {} }),
    ).toThrow(/at least one rating/i);
  });

  it("rejects unknown questions and partner context in staff feedback", () => {
    expect(() =>
      validateAnonymousSurveySubmission({
        ...base,
        ratings: { unknown_question: 4 },
      }),
    ).toThrow(/unknown rating/i);
    expect(() =>
      validateAnonymousSurveySubmission({
        ...base,
        context: { relationship_type: "partner" },
      }),
    ).toThrow(/cannot include partner context/i);
  });

  it("calculates averages from submitted ratings and excludes blanks", () => {
    const aggregate = aggregateSurveyResponses("staff", [
      { answers: validateAnonymousSurveySubmission(base) },
      {
        answers: validateAnonymousSurveySubmission({
          ...base,
          idempotencyKey: "4a99bde9-78d0-4e6e-a9c5-79f0315aec5b",
          ratings: { S1a: 1 },
          comments: {},
        }),
      },
    ]);
    expect(aggregate.responseCount).toBe(2);
    expect(
      aggregate.questionAverages.find((item) => item.questionId === "S1a"),
    ).toMatchObject({
      average: 3,
      responseCount: 2,
    });
    expect(
      aggregate.questionAverages.find((item) => item.questionId === "S1c")
        ?.average,
    ).toBeNull();
  });

  it("scrubs common direct identifiers before feedback is passed to the AI", () => {
    const scrubbed = deidentifySurveyComment(
      "Contact Jane Doe at jane@example.com or https://example.com, 604-555-0101.",
    );
    expect(scrubbed).toContain("[name removed]");
    expect(scrubbed).toContain("[email removed]");
    expect(scrubbed).toContain("[link removed]");
    expect(scrubbed).toContain("[phone removed]");
    expect(scrubbed).not.toMatch(/Jane|Doe|example\.com|604-555-0101/);
  });

  it("flags meaningful score gaps", () => {
    expect(
      calculateMeaningfulGaps([
        {
          sectionId: "strong",
          sectionLabel: "Strong",
          average: 4.8,
          responseCount: 5,
        },
        { sectionId: "gap", sectionLabel: "Gap", average: 4, responseCount: 5 },
      ]),
    ).toHaveLength(1);
  });

  it("keeps all question identifiers deterministic for the public form and database validation", () => {
    expect(getQuestionIds("staff")).toHaveLength(18);
    expect(getQuestionIds("partner")).toHaveLength(14);
  });
});
