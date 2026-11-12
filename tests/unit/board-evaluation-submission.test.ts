import { describe, expect, it } from "vitest";

import { validateBoardEvaluationSubmission } from "@/lib/board-evaluation/validate-submission";

const annual = { kind: "annual" as const, selectedRated: ["s1q0", "s1q1"], selectedOpen: ["0"] };
const meeting = { kind: "meeting" as const, selectedRated: ["g0q0"], selectedOpen: [] };

describe("anonymous Board Evaluation submissions", () => {
  it("accepts partial annual ratings and N/A without respondent identity", () => {
    expect(validateBoardEvaluationSubmission(annual, { ratings: { s1q0: "na" }, openEnded: { "0": "A theme" } }))
      .toMatchObject({ ok: true, ratings: { s1q0: "na" }, openEnded: { "0": "A theme" } });
  });

  it("rejects unknown questions, invalid scales, and oversized open text", () => {
    expect(validateBoardEvaluationSubmission(annual, { ratings: { other: 5 }, openEnded: {} }).ok).toBe(false);
    expect(validateBoardEvaluationSubmission(meeting, { ratings: { g0q0: "na" }, comment: "" }).ok).toBe(false);
    expect(validateBoardEvaluationSubmission(annual, { ratings: {}, openEnded: { "0": "x".repeat(4001) } }).ok).toBe(false);
  });

  it("accepts a meeting response with an optional comment", () => {
    expect(validateBoardEvaluationSubmission(meeting, { ratings: { g0q0: 4 }, comment: "" }))
      .toMatchObject({ ok: true, ratings: { g0q0: 4 }, comment: "" });
  });
});
