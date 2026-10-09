import { describe, expect, it } from "vitest";

import { signupMembershipPlans } from "@/lib/plans";
import { fixedPriceOffers, foundingYearPrice } from "@/lib/pricing";

describe("2026 annual pricing catalog", () => {
  it("calculates the approved annual totals for each of the first two founding years", () => {
    expect(signupMembershipPlans.map((plan) => foundingYearPrice(plan.annualPrice))).toEqual([
      998.75,
      3000.5,
      6001,
    ]);
  });

  it("keeps add-on and sponsorship cadence explicit", () => {
    expect(Object.values(fixedPriceOffers).map(({ amount, cadence }) => [amount, cadence])).toEqual([
      [1195, "annual"],
      [1495, "annual"],
      [99, "annual"],
      [500, "one-time"],
      [1200, "one-time"],
      [1000, "one-time"],
      [3000, "one-time"],
      [1200, "one-time"],
    ]);
  });
});
