import { describe, expect, it } from "vitest";

import {
  formatCurrencyInput,
  isValidPhoneNumber,
  normalizeEmail,
  normalizeHttpUrl,
  parseFormBoolean,
  parseIsoDate,
  parseStrictDecimal,
  parseStrictInteger,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  sanitizePhoneInput,
} from "@/lib/input-validation";

describe("shared input validation", () => {
  it("sanitizes phone input without allowing letters", () => {
    expect(sanitizePhoneInput("+1 (604) 555-0123abc")).toBe(
      "+1 (604) 555-0123",
    );
    expect(isValidPhoneNumber("+1 (604) 555-0123")).toBe(true);
    expect(isValidPhoneNumber("call me")).toBe(false);
    expect(isValidPhoneNumber("604-555-0100 ext 12")).toBe(false);
  });

  it("sanitizes integer and decimal fields predictably", () => {
    expect(sanitizeIntegerInput("12e3")).toBe("123");
    expect(sanitizeDecimalInput("$1,234.567")).toBe("1234.56");
    expect(formatCurrencyInput("1234.5")).toContain("1,234.50");
    expect(formatCurrencyInput("1234.5")).toContain("$");
  });

  it("rejects partial or incorrectly formatted server-side numbers", () => {
    expect(parseStrictInteger("12", "Seats", 1)).toBe(12);
    expect(parseStrictDecimal("12.50", "Amount", 0)).toBe(12.5);
    expect(() => parseStrictInteger("12abc", "Seats", 1)).toThrow();
    expect(() => parseStrictDecimal("$12", "Amount", 0)).toThrow();
  });

  it("normalizes emails and limits URLs to http or https", () => {
    expect(normalizeEmail(" Bruno@Example.org ")).toBe("bruno@example.org");
    expect(normalizeHttpUrl("https://example.org/path")).toBe(
      "https://example.org/path",
    );
    expect(() => normalizeHttpUrl("javascript:alert(1)")).toThrow();
  });

  it("accepts only explicit boolean form values", () => {
    expect(parseFormBoolean("true", "Enabled")).toBe(true);
    expect(parseFormBoolean("false", "Enabled")).toBe(false);
    expect(parseFormBoolean("on", "Enabled")).toBe(true);
    expect(parseFormBoolean(null, "Enabled")).toBe(false);
    expect(() => parseFormBoolean("yes", "Enabled")).toThrow(
      "Enabled must be true or false.",
    );
  });

  it("accepts only real ISO calendar dates", () => {
    expect(parseIsoDate("2026-07-24", "Start date").toISOString()).toBe(
      "2026-07-24T00:00:00.000Z",
    );
    expect(() => parseIsoDate("2026-02-30", "Start date")).toThrow();
    expect(() => parseIsoDate("July 24, 2026", "Start date")).toThrow();
  });
});
