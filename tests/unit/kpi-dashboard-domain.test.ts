import { describe, expect, it } from "vitest";

import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  defaultQuarterAssignments,
  formatNumber,
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
});
