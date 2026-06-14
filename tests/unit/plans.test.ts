import { describe, expect, it } from "vitest";

import { getPlan, membershipPlans } from "@/lib/plans";

describe("membership plans", () => {
  it("keeps every supported tier unique and priced annually at ten months", () => {
    expect(new Set(membershipPlans.map(({ id }) => id)).size).toBe(4);

    for (const plan of membershipPlans) {
      expect(plan.annualPrice).toBe(plan.monthlyPrice * 10);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("returns Roots as the conservative fallback for an unknown tier", () => {
    expect(getPlan("roots").id).toBe("roots");
    expect(getPlan("unknown" as "roots").id).toBe("roots");
  });
});
