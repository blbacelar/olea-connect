import { describe, expect, it } from "vitest";

import { signupMembershipPlans } from "@/lib/plans";
import { foundingPricing, getFoundingSavings } from "@/lib/founding-pricing";
import { fixedPriceOffers } from "@/lib/pricing";

describe("2026 annual pricing catalog", () => {
  it("matches the approved standard and exact founding annual and quarterly totals", () => {
    expect(signupMembershipPlans.map((plan) => [
      plan.annualPrice,
      foundingPricing[plan.id as keyof typeof foundingPricing].annual.founding,
      plan.quarterlyPrice,
      foundingPricing[plan.id as keyof typeof foundingPricing].quarterly.founding,
      getFoundingSavings(plan.id as keyof typeof foundingPricing),
    ])).toEqual([
      [1180, 1000, 325, 275, 360],
      [3530, 3000, 975, 825, 1060],
      [7060, 6000, 1950, 1650, 2120],
    ]);
  });

  it("keeps add-on and sponsorship cadence explicit", () => {
    expect(Object.values(fixedPriceOffers).map(({ amount, cadence }) => [amount, cadence])).toEqual([
      [895, "annual"],
      [795, "annual"],
      [595, "annual"],
      [995, "annual"],
      [1495, "annual"],
      [795, "annual"],
      [1195, "annual"],
      [99, "annual"],
      [500, "one-time"],
      [1200, "one-time"],
      [1000, "one-time"],
      [3000, "one-time"],
      [1200, "one-time"],
    ]);
  });
});
