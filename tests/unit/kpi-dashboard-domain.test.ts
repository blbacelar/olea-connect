import { describe, expect, it } from "vitest";

import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  decimalNumberPattern,
  defaultQuarterAssignments,
  formatNumber,
  nextSortOrderAfter,
  parseOptionalNumber,
  parseRequiredNumber,
  suggestRagStatus,
  validateQuarterAssignments,
} from "@/lib/kpi-dashboard/domain";

describe("KPI dashboard domain helpers", () => {
  it("validates that every month belongs to exactly one quarter", () => {
    const assignments = defaultQuarterAssignments();

    expect(validateQuarterAssignments(assignments)).toEqual([]);
    expect(
      validateQuarterAssignments(assignments.filter((item) => item.monthNumber !== 12)),
    ).toContain("All 12 months must be assigned to a quarter.");
    expect(
      validateQuarterAssignments(
        assignments.map((item) =>
          item.monthNumber === 12 ? { ...item, monthNumber: 1 } : item,
        ),
      ),
    ).toContain("Each month can only be assigned to one quarter.");
  });

  it("calculates Auto-RAG from percent to target", () => {
    expect(calculatePercentToTarget(90, 100)).toBe(90);
    expect(suggestRagStatus(95, 100)).toBe("green");
    expect(suggestRagStatus(70, 100)).toBe("amber");
    expect(suggestRagStatus(20, 100)).toBe("red");
    expect(suggestRagStatus(null, 100)).toBe("na");
    expect(suggestRagStatus(20, 0)).toBe("na");
  });

  it("calculates variance and trend without implying context", () => {
    expect(calculateVariance(70, 100)).toBe(-30);
    expect(calculateTrend(80, 70)).toBe("improving");
    expect(calculateTrend(60, 70)).toBe("declining");
    expect(calculateTrend(70, 70)).toBe("stable");
    expect(calculateTrend(70, null)).toBe("not_available");
  });

  it("formats numeric values for reports", () => {
    expect(formatNumber(1500000)).toBe("1,500,000");
    expect(formatNumber(12.5)).toBe("12.50");
    expect(formatNumber(null)).toBe("—");
  });

  it("uses a browser-compatible decimal pattern for KPI number inputs", () => {
    const pattern = new RegExp(`^${decimalNumberPattern}$`);

    expect(decimalNumberPattern).toBe(String.raw`\d+(\.\d{1,2})?`);
    expect(pattern.test("65")).toBe(true);
    expect(pattern.test("65.00")).toBe(true);
    expect(pattern.test("1500000.5")).toBe(true);
    expect(pattern.test("$65")).toBe(false);
    expect(pattern.test("65.000")).toBe(false);
  });

  it("parses KPI number fields after display formatting", () => {
    const required = new FormData();
    required.set("targetNumber", "1500000.50");

    const optional = new FormData();
    optional.set("baselineNumber", "65.00");

    expect(parseRequiredNumber(required, "targetNumber", "Target number")).toBe(
      1500000.5,
    );
    expect(parseOptionalNumber(optional, "baselineNumber", "Baseline number")).toBe(
      65,
    );
  });

  it("rejects KPI number fields with unsupported formats", () => {
    const formData = new FormData();
    formData.set("targetNumber", "65.000");

    expect(() =>
      parseRequiredNumber(formData, "targetNumber", "Target number"),
    ).toThrow("Target number must contain a number with up to 2 decimals.");

    formData.set("targetNumber", "1,500.00");
    expect(() =>
      parseRequiredNumber(formData, "targetNumber", "Target number"),
    ).toThrow("Target number must contain a number with up to 2 decimals.");
  });

  it("generates sort orders that stay inside Postgres integer limits", () => {
    expect(nextSortOrderAfter(undefined)).toBe(1);
    expect(nextSortOrderAfter(null)).toBe(1);
    expect(nextSortOrderAfter(0)).toBe(1);
    expect(nextSortOrderAfter(41)).toBe(42);
    expect(nextSortOrderAfter(1.5)).toBe(1);
    expect(nextSortOrderAfter(-1)).toBe(1);
    expect(() => nextSortOrderAfter(2147483647)).toThrow(
      "Sort order limit reached.",
    );
  });
});
