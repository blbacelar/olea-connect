import { describe, expect, it } from "vitest";

import { getPlan, membershipPlans } from "@/lib/plans";

describe("membership plans", () => {
  it("keeps every supported tier unique and priced annually at four quarters", () => {
    expect(new Set(membershipPlans.map(({ id }) => id)).size).toBe(4);

    for (const plan of membershipPlans) {
      expect(plan.annualPrice).toBe(plan.quarterlyPrice * 4);
      expect(plan.foundingAnnualPrice).toBe(
        Math.round(plan.annualPrice * 0.85),
      );
      expect(plan.foundingQuarterlyPrice).toBe(
        Math.round(plan.quarterlyPrice * 0.85),
      );
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("matches the 2026 pricing handoff seat limits", () => {
    expect(membershipPlans.map(({ id, seats }) => [id, seats])).toEqual([
      ["seedling", "5 seats included"],
      ["roots", "10 seats included"],
      ["canopy", "15 seats included"],
      ["harvest", "20 seats included"],
    ]);
  });

  it("returns Roots as the conservative fallback for an unknown tier", () => {
    expect(getPlan("roots").id).toBe("roots");
    expect(getPlan("unknown" as "roots").id).toBe("roots");
  });
});
