import { describe, expect, it } from "vitest";

import {
  formatCad,
  pricingAddOns,
  pricingPolicies,
  referralRewards,
  retreatFacilitation,
} from "@/lib/pricing";

describe("pricing package", () => {
  it("matches the approved add-on catalog", () => {
    expect(pricingAddOns.map(({ name }) => name)).toEqual([
      "Impact Coaching",
      "Admin Support",
    ]);
    expect(
      pricingAddOns[0].packages.map(({ quarterlyPrice }) => quarterlyPrice),
    ).toEqual([1944, 3888, 5832]);
    expect(
      pricingAddOns[1].packages.map(({ quarterlyPrice }) => quarterlyPrice),
    ).toEqual([1200, 2400, 3600]);
    expect(retreatFacilitation.map(({ price }) => price)).toEqual([1400, 2300]);
  });

  it("exposes referral rewards and public pricing policies", () => {
    expect(referralRewards).toHaveLength(3);
    expect(referralRewards[0].grant).toContain("$250");
    expect(referralRewards[1].coaching).toContain("4");
    expect(pricingPolicies.trial).toBe("No free trial");
    expect(pricingPolicies.extraSeat).toContain("$15 CAD");
  });

  it("formats Canadian dollar display values consistently", () => {
    expect(formatCad(1944)).toBe("$1,944 CAD");
  });
});
