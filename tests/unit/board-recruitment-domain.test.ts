import { describe, expect, it } from "vitest";

import {
  calculateTerm,
  coverageLevel,
  recruitmentCategories,
} from "@/lib/board-recruitment/domain";

describe("Board Recruitment domain", () => {
  it("seeds the complete four-category skill catalog", () => {
    expect(recruitmentCategories).toHaveLength(4);
    expect(
      recruitmentCategories.reduce(
        (total, category) => total + category.skills.length,
        0,
      ),
    ).toBe(53);
  });

  it("classifies coverage by board percentage", () => {
    expect(coverageLevel(0, 5)).toBe("none");
    expect(coverageLevel(1, 5)).toBe("gap");
    expect(coverageLevel(2, 5)).toBe("moderate");
    expect(coverageLevel(3, 5)).toBe("strong");
  });

  it("calculates standing and term-limited directors", () => {
    const workspace = {
      termLengthYears: 3,
      maxConsecutiveTerms: 3,
      maxYearsOfService: 10,
      upcomingAgmYear: 2026,
    } as const;
    expect(
      calculateTerm(
        { memberType: "director", dateJoined: "2023-06-01" },
        workspace,
      ),
    ).toMatchObject({ endYear: 2026, status: "standing" });
    expect(
      calculateTerm(
        { memberType: "director", dateJoined: "2012-06-01" },
        workspace,
      ),
    ).toMatchObject({ status: "term-limited", eligible: false });
    expect(
      calculateTerm(
        { memberType: "staff", dateJoined: "2020-01-01" },
        workspace,
      ),
    ).toMatchObject({ status: "staff" });
  });
});
