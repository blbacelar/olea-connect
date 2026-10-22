import { describe, expect, it } from "vitest";

import { reportedBudgetMatchesTier, summarizeFundedBoards } from "@/lib/sponsors/impact";

describe("funded board progress", () => {
  it("counts only placements for the requested term and excludes cancellations", () => {
    const placements = [
      { sponsorshipId: "a", planId: "seedling", status: "active" },
      { sponsorshipId: "a", planId: "roots", status: "completed" },
      { sponsorshipId: "a", planId: "roots", status: "canceled" },
      { sponsorshipId: "b", planId: "seedling", status: "active" },
    ];

    expect(summarizeFundedBoards(placements, "a")).toEqual({
      sponsorshipId: "a",
      placed: 2,
      active: 1,
      seedling: 1,
      roots: 1,
    });
    expect(summarizeFundedBoards(placements, "missing")).toEqual({
      sponsorshipId: "missing",
      placed: 0,
      active: 0,
      seedling: 0,
      roots: 0,
    });
  });
});

describe("funded membership suggestions", () => {
  it("suggests organizations by reported budget without treating it as confirmed eligibility", () => {
    expect(reportedBudgetMatchesTier("under-250k", "seedling")).toBe(true);
    expect(reportedBudgetMatchesTier("500k-1m", "seedling")).toBe(false);
    expect(reportedBudgetMatchesTier("1m-2m", "roots")).toBe(true);
    expect(reportedBudgetMatchesTier("250k-500k", "roots")).toBe(false);
  });
});
