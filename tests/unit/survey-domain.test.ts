import { describe, expect, it } from "vitest";

import {
  calculateSectionAverages,
  countCompletedSurveyAnswers,
} from "@/lib/survey-domain";

describe("survey domain", () => {
  it("calculates numeric averages while excluding not-applicable answers", () => {
    const averages = calculateSectionAverages({
      1: 5,
      2: 3,
      3: "na",
    });

    expect(averages[0].average).toBe(4);
    expect(averages[1].average).toBeNull();
  });

  it("counts answered questions including not-applicable answers", () => {
    expect(countCompletedSurveyAnswers({ 1: 5, 2: "na" })).toBe(2);
  });
});
