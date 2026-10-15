import { describe, expect, it } from "vitest";

import { getPlan, membershipPlans, signupMembershipPlans } from "@/lib/plans";
import { getUpgradeOptions } from "@/app/subscription/plan-upgrade-helpers";

describe("membership plans", () => {
  it("offers only the three active memberships", () => {
    expect(new Set(membershipPlans.map(({ id }) => id)).size).toBe(3);
    expect(signupMembershipPlans.map(({ id, annualPrice }) => [id, annualPrice])).toEqual([
      ["seedling", 1180],
      ["roots", 3530],
      ["canopy", 7060],
    ]);
    expect(membershipPlans.map(({ quarterlyPrice }) => quarterlyPrice)).toEqual([
      325, 975, 1950,
    ]);
  });

  it("matches the 2026 pricing handoff seat limits", () => {
    expect(membershipPlans.map(({ id, seats }) => [id, seats])).toEqual([
      ["seedling", "5 seats included"],
      ["roots", "10 seats included"],
      ["canopy", "15 seats included"],
    ]);
  });

  it("does not advertise discontinued Olea grant applications in tiers", () => {
    const features = membershipPlans.flatMap((plan) => plan.features).join(" ");
    expect(features).not.toMatch(/Olea Gives applications|member-only grants/i);
  });

  it("keeps strategic planning unavailable below Canopy", () => {
    expect(getPlan("seedling").notIncluded).toContain(
      "Strategic planning module",
    );
    expect(getPlan("roots").notIncluded).toContain(
      "Strategic planning module",
    );
    expect(getPlan("canopy").features).toContain(
      "Strategic planning module",
    );
  });

  it("returns Roots as the conservative fallback for an unknown tier", () => {
    expect(getPlan("roots").id).toBe("roots");
    expect(getPlan("unknown" as "roots").id).toBe("roots");
  });

  it("never offers a retired tier as an upgrade", () => {
    expect(getUpgradeOptions("seedling").map((plan) => plan.id)).toEqual([
      "roots",
      "canopy",
    ]);
    expect(getUpgradeOptions("roots").map((plan) => plan.id)).toEqual([
      "canopy",
    ]);
    expect(getUpgradeOptions("canopy")).toEqual([]);
    expect(getUpgradeOptions("harvest")).toEqual([]);
  });
});
