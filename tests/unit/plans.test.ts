import { describe, expect, it } from "vitest";

import { getPlan, membershipPlans, signupMembershipPlans } from "@/lib/plans";

describe("membership plans", () => {
  it("keeps legacy tiers while offering the approved annual signup prices", () => {
    expect(new Set(membershipPlans.map(({ id }) => id)).size).toBe(4);
    expect(signupMembershipPlans.map(({ id, annualPrice }) => [id, annualPrice])).toEqual([
      ["seedling", 1175],
      ["roots", 3530],
      ["canopy", 7060],
    ]);
    expect(membershipPlans.map(({ quarterlyPrice }) => quarterlyPrice)).toEqual([
      200, 800, 1500, 2400,
    ]);
    expect(getPlan("harvest").annualPrice).toBe(9600);
  });

  it("matches the 2026 pricing handoff seat limits", () => {
    expect(membershipPlans.map(({ id, seats }) => [id, seats])).toEqual([
      ["seedling", "5 seats included"],
      ["roots", "10 seats included"],
      ["canopy", "15 seats included"],
      ["harvest", "20 seats included"],
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
});
