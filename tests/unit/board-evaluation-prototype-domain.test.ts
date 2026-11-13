import { describe, expect, it } from "vitest";

import {
  aggregateAnnualResponses,
  aggregateMeetingResponses,
  annualQuestions,
  meetingQuestions,
  scoreFlag,
  scoreTrend,
} from "@/lib/board-evaluation/prototype-domain";

describe("final Board Evaluation question and scoring contract", () => {
  it("keeps the exact annual and post-meeting question counts", () => {
    expect(annualQuestions).toHaveLength(44);
    expect(new Set(annualQuestions.map((question) => question.id)).size).toBe(44);
    expect(meetingQuestions).toHaveLength(7);
  });

  it("suppresses small samples and hides distributions on small boards", () => {
    const question = annualQuestions[0];
    const four = aggregateAnnualResponses({ responses: Array.from({ length: 4 }, () => ({ [question.id]: 5 })), invited: 7 });
    expect(four.questions[0]).toMatchObject({ suppressed: true, average: null, distribution: null });
    const five = aggregateAnnualResponses({ responses: Array.from({ length: 5 }, () => ({ [question.id]: 5 })), invited: 7 });
    expect(five.questions[0]).toMatchObject({ suppressed: false, average: 5, distribution: null });
    expect(five.sections[0]).toMatchObject({ average: 5, flag: "strength" });
    expect(five.responseRate).toBe(71);
    const largerBoard = aggregateAnnualResponses({ responses: Array.from({ length: 5 }, () => ({ [question.id]: 4 })), invited: 9 });
    expect(largerBoard.questions[0].distribution).toEqual([0, 0, 0, 5, 0]);
  });

  it("ignores N/A and applies concern/trend thresholds", () => {
    const first = annualQuestions[0].id;
    const scores = aggregateAnnualResponses({
      responses: [{ [first]: "na" }, ...Array.from({ length: 5 }, () => ({ [first]: 2 }))],
      invited: 9,
      previousSectionScores: { "1": 2.5 },
    });
    expect(scores.questions[0]).toMatchObject({ count: 5, average: 2, percentPositive: 0 });
    expect(scores.sections[0]).toMatchObject({ flag: "concern", trend: "down", persistentConcern: true });
    expect(scoreFlag(4.5)).toBe("strength");
    expect(scoreFlag(3.5)).toBe("satisfactory");
    expect(scoreFlag(3)).toBe("improve");
    expect(scoreTrend(4, 3.7)).toBe("up");
  });

  it("flags low post-meeting items only after the privacy threshold", () => {
    const id = meetingQuestions[0].id;
    expect(aggregateMeetingResponses(Array.from({ length: 4 }, () => ({ [id]: 1 })))[0].suppressed).toBe(true);
    expect(aggregateMeetingResponses(Array.from({ length: 5 }, () => ({ [id]: 2 })))[0])
      .toMatchObject({ average: 2, assessment: "below_expectations", specificConcern: true });
  });
});
