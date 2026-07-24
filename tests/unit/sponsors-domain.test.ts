import { describe, expect, it } from "vitest";

import {
  canViewPrivateSponsorFinancials,
  normalizeOptionalEmail,
  normalizeOptionalHttpUrl,
  normalizeOptionalPhone,
  normalizeSponsorSlug,
  parseCurrencyToCents,
  summarizeContributionReconciliation,
  validateOptionalHttpUrl,
  validateCurrencyToCents,
  validateOptionalCurrencyToCents,
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
    expect(parseCurrencyToCents("1234.56")).toBe(123_456);
    expect(parseCurrencyToCents("not money")).toBe(0);
    expect(parseCurrencyToCents("12.345")).toBe(0);
    expect(parseCurrencyToCents("-10")).toBe(0);
  });

  it("throws actionable validation errors for invalid sponsor currency fields", () => {
    expect(validateCurrencyToCents("12000.00", "Contract amount")).toBe(
      1_200_000,
    );
    expect(validateOptionalCurrencyToCents("", "Allocation amount")).toBe(0);
    expect(validateOptionalCurrencyToCents("500", "Allocation amount")).toBe(50_000);
    expect(() => validateCurrencyToCents("$12,000.00", "Contract amount")).toThrow(
      "Contract amount must contain numbers only, with up to 2 decimals.",
    );

    expect(() => validateCurrencyToCents("", "Contract amount")).toThrow(
      "Contract amount is required.",
    );
    expect(() => validateCurrencyToCents("12.345", "Contract amount")).toThrow(
      "Contract amount must contain numbers only, with up to 2 decimals.",
    );
    expect(() =>
      validateOptionalCurrencyToCents("not money", "Allocation amount"),
    ).toThrow("Allocation amount must contain numbers only, with up to 2 decimals.");
  });

  it("only accepts safe http or https sponsor URLs", () => {
    expect(normalizeOptionalHttpUrl("https://example.org/sponsor")).toBe(
      "https://example.org/sponsor",
    );
    expect(normalizeOptionalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeOptionalHttpUrl("not a url")).toBeNull();
  });

  it("validates sponsor contact emails and phone numbers", () => {
    expect(normalizeOptionalEmail("  Partner@Example.org ")).toBe(
      "partner@example.org",
    );
    expect(normalizeOptionalEmail(null)).toBeNull();
    expect(() => normalizeOptionalEmail("not an email")).toThrow(
      "Email must be a valid email address.",
    );

    expect(normalizeOptionalPhone("+1 (555) 555-5555")).toBe(
      "+1 (555) 555-5555",
    );
    expect(normalizeOptionalPhone(null)).toBeNull();
    expect(() => normalizeOptionalPhone("123")).toThrow(
      "Phone must be a valid phone number.",
    );
    expect(() => normalizeOptionalPhone("604-555-0100 ext 12")).toThrow(
      "Phone must be a valid phone number.",
    );
  });

  it("throws actionable validation errors for unsafe sponsor URLs", () => {
    expect(validateOptionalHttpUrl("https://example.org")).toBe(
      "https://example.org/",
    );
    expect(validateOptionalHttpUrl(null)).toBeNull();
    expect(() =>
      validateOptionalHttpUrl("ftp://example.org", "Website"),
    ).toThrow("Website must be a valid http or https URL.");
  });
});
