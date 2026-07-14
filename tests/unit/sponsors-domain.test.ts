import { describe, expect, it } from "vitest";

import {
  canViewPrivateSponsorFinancials,
  normalizeOptionalHttpUrl,
  normalizeSponsorSlug,
  parseCurrencyToCents,
  summarizeContributionReconciliation,
} from "@/lib/sponsors/domain";

describe("sponsor domain rules", () => {
  it("reconciles sponsor contribution totals against grant allocations", () => {
    expect(
      summarizeContributionReconciliation([
        { amountCents: 100_000, allocatedAmountCents: 75_000 },
        { amountCents: 50_000, allocatedAmountCents: 50_000 },
      ]),
    ).toEqual({
      allocatedAmountCents: 125_000,
      contributionAmountCents: 150_000,
      isReconciled: false,
      unallocatedAmountCents: 25_000,
    });
  });

  it("marks fully allocated contributions as reconciled", () => {
    expect(
      summarizeContributionReconciliation([
        { amountCents: 50_000, allocatedAmountCents: 50_000 },
      ]),
    ).toMatchObject({
      isReconciled: true,
      unallocatedAmountCents: 0,
    });
  });

  it("limits private sponsor finance details to finance and platform admins", () => {
    expect(canViewPrivateSponsorFinancials(["super_admin"])).toBe(true);
    expect(canViewPrivateSponsorFinancials(["finance_admin"])).toBe(true);
    expect(canViewPrivateSponsorFinancials(["grants_admin"])).toBe(false);
    expect(canViewPrivateSponsorFinancials([])).toBe(false);
  });

  it("normalizes sponsor slugs and currency inputs consistently", () => {
    expect(normalizeSponsorSlug("  Acme Foundation + Friends  ")).toBe(
      "acme-foundation-friends",
    );
    expect(parseCurrencyToCents("$1,234.56")).toBe(123_456);
    expect(parseCurrencyToCents("not money")).toBe(0);
  });

  it("only accepts safe http or https sponsor URLs", () => {
    expect(normalizeOptionalHttpUrl("https://example.org/sponsor")).toBe(
      "https://example.org/sponsor",
    );
    expect(normalizeOptionalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeOptionalHttpUrl("not a url")).toBeNull();
  });
});
