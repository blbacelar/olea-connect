import { describe, expect, it } from "vitest";

import { publicSiteCopy } from "@/lib/i18n/public-site-copy";
import { formatCad, pricingPolicies } from "@/lib/pricing";

describe("pricing package", () => {
  it("offers custom-quoted support without unapproved public package prices", () => {
    const addOns = publicSiteCopy["en-CA"].pricing.addOns;
    expect(addOns.map(({ name }) => name)).toEqual([
      "Impact Coaching",
      "Admin Support",
    ]);
    expect(addOns.every(({ description }) => description.length > 0)).toBe(true);
    expect(publicSiteCopy["en-CA"].pricing.requestQuote).toMatch(/quote/i);
  });

  it("exposes public pricing policies", () => {
    expect(pricingPolicies.trial).toBe("No free trial");
    expect(pricingPolicies.extraSeat).toContain("$15 CAD");
  });

  it("formats Canadian dollar display values consistently", () => {
    expect(formatCad(1944)).toBe("$1,944 CAD");
    expect(formatCad(1944, "fr-CA")).toBe("1\u00A0944\u00A0$ CA");
  });
});
