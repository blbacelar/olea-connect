import { describe, expect, it } from "vitest";

import { annualCompensationSchema, annualGeneralSchema, annualReviewDefaults,
  annualReviewRoleMatrix, calculateAnnualReview } from "@/lib/ed-review/annual-document";
import { annualFieldValue, annualText } from "@/lib/ed-review/annual-copy";
import { parseStandaloneEdReviewArchive } from "@/lib/ed-review/annual-html-import";

describe("ED annual document", () => {
  it("matches the eight-section role matrix and hides compensation from ED/HR/admin", () => {
    expect(annualReviewRoleMatrix.chair.comp).toBe("edit");
    expect(annualReviewRoleMatrix.cfo.comp).toBe("read");
    for (const role of ["ed", "hr", "admin"] as const) {
      expect(annualReviewRoleMatrix[role].comp).toBe("hide");
      expect(annualReviewRoleMatrix[role].future).toBe("hide");
    }
  });

  it("uses equal weights only when none are positive", () => {
    const { general, compensation } = annualReviewDefaults();
    general.competencies[0].selfRating = 3;
    general.competencies[1].selfRating = 5;
    expect(calculateAnnualReview(general, compensation).selfScore).toBe(4);
    general.competencies[0].weight = 20;
    expect(calculateAnnualReview(general, compensation).selfScore).toBe(3);
    expect(calculateAnnualReview(general, compensation).weightWarning).toBe(true);
  });

  it("shows gaps over one point and computes band, salary, and costs", () => {
    const { general, compensation } = annualReviewDefaults();
    general.competencies[0].selfRating = 2;
    general.competencies[0].chairRating = 4;
    general.competencies[1].selfRating = 3;
    general.competencies[1].chairRating = 4;
    compensation.currentSalaryCents = 10_000_000;
    compensation.recommendedPercent = 5;
    compensation.milestoneBonuses = [{ id: "m1", title: "Milestone", amountCents: 50_000,
      status: "achieved", target: "Q2 2027" }];
    general.development.external = [{ id: "x1", activity: "Training", costCents: 20_000,
      provider: "College", dates: "2027", approved: "yes" }];
    const result = calculateAnnualReview(general, compensation);
    expect(result.chairScore).toBe(4);
    expect(result.activeBand).toBe("b2");
    expect(result.gaps.map((item) => item.highlight).slice(0, 2)).toEqual([true, false]);
    expect(result.recommendedSalaryCents).toBe(10_500_000);
    expect(result.milestoneTotalCents).toBe(50_000);
    expect(result.developmentCostCents).toBe(20_000);
  });

  it("rejects malformed ratings and compensation emails", () => {
    const defaults = annualReviewDefaults();
    expect(annualGeneralSchema.safeParse(defaults.general).success).toBe(true);
    expect(annualCompensationSchema.safeParse(defaults.compensation).success).toBe(true);
    defaults.general.competencies[0].selfRating = 6;
    defaults.compensation.cfoEmail = "invalid";
    expect(annualGeneralSchema.safeParse(defaults.general).success).toBe(false);
    expect(annualCompensationSchema.safeParse(defaults.compensation).success).toBe(false);
  });

  it("persists every field group present in the final HTML, including newly restored fields", () => {
    const { general, compensation } = annualReviewDefaults();
    general.cover.yearsInRole = 2.5;
    general.cover.sources = ["staff", "partners", "stakeholders"];
    general.competencies[0].name = "Strategic leadership";
    general.competencies[0].kpis = "Two completed partnerships";
    general.development.smartGoals[0].measure = "Two partnerships";
    general.development.smartGoals[0].relevant = "Supports the strategic plan";
    general.development.growthGoals[0].area = "Financial acumen";
    general.development.growthGoals[0].method = "Mentorship";
    general.development.external[0].provider = "College";
    general.development.external[0].dates = "2027";
    general.development.external[0].approved = "pending";
    general.signoff.actions[0].detail = "Present the completed plan to the board";
    compensation.lastReviewDate = "2026-01-01";
    compensation.lastAdjustment = "4%";
    compensation.totalPackageCents = 15_000_000;
    compensation.effectiveDate = "2027-01-01";
    compensation.rationale = "Strong performance";
    compensation.boardApprovalDate = "2026-12-01";
    compensation.approvedBy = "Chair";
    compensation.minuteReference = "2026-12-01-5";
    compensation.milestoneBonuses[0].target = "Q2 2027";
    compensation.future.targetDate = "Within 18 months";
    compensation.future.boardNotes = "Board to review after next audit";

    expect(annualGeneralSchema.parse(general)).toEqual(general);
    expect(annualCompensationSchema.parse(compensation)).toEqual(compensation);
    expect(annualText("fr-CA", "Board Chair Assessment")).toBe("Évaluation de la présidence du conseil");
    expect(annualText("en-CA", "Board Chair Assessment")).toBe("Board Chair Assessment");
  });

  it("imports standalone HTML JSON exports without dropping survey, scoring, compensation or action values", () => {
    const imported = parseStandaloneEdReviewArchive({ _type: "ed-review", store: {
      "cover.org": "Community Society", "cover.src_staff": true, "cover.src_partners": "true",
      "cover.years": "2.5", "comp.c0.name": "Leadership", "comp.c0.weight": "100",
      "self.c0.rating": "4", "chair.c0.rating": "5", "comp.currentSalary": "125,000",
      "comp.lastReviewDate": "15/10/2026", "comp.recPct": "5", "mile.m0.status": "In Progress",
      "mile.m0.amount": "600", "smart.sm0.measure": "Two partnerships",
      "goal.g0.area": "Finance", "ext.x0.provider": "College", "ext.x0.approved": "Yes",
      "future.targetDate": "Within 18 months", "act.a0.detail": "Present to Board",
    }, competencies: [{ id: "c0" }], milestones: [{ id: "m0" }],
      smartGoals: [{ id: "sm0" }], goals: [{ id: "g0" }],
      externals: [{ id: "x0" }], actions: [{ id: "a0" }] });
    expect(imported.general.cover.sources).toEqual(["staff", "partners"]);
    expect(imported.general.cover.yearsInRole).toBe(2.5);
    expect(imported.general.competencies[0].chairRating).toBe(5);
    expect(imported.general.development.smartGoals[0].measure).toBe("Two partnerships");
    expect(imported.general.signoff.actions[0].detail).toBe("Present to Board");
    expect(imported.compensation.currentSalaryCents).toBe(12_500_000);
    expect(imported.compensation.lastReviewDate).toBe("2026-10-15");
    expect(imported.compensation.milestoneBonuses[0].status).toBe("in_progress");
  });

  it("renders the standalone future remuneration guidance in French without changing saved source values", () => {
    const value = annualReviewDefaults().compensation.future;
    expect(annualFieldValue("fr-CA", value.purpose, value.purpose)).toContain("juridiquement contraignant");
    expect(annualFieldValue("fr-CA", value.currentStatus, value.currentStatus)).toContain("Aucun régime officiel");
    expect(annualFieldValue("en-CA", value.purpose, value.purpose)).toBe(value.purpose);
  });

  it("preserves user-entered values when switching the review to French", () => {
    const defaultPurpose = annualReviewDefaults().compensation.future.purpose;
    expect(annualText("fr-CA", "Strong")).toBe("Solide");
    expect(annualFieldValue("fr-CA", "Strong")).toBe("Strong");
    expect(annualFieldValue("fr-CA", "Board Chair")).toBe("Board Chair");
    expect(annualFieldValue("fr-CA", "Strong", defaultPurpose)).toBe("Strong");
    expect(annualFieldValue("fr-CA", "A custom board agreement", defaultPurpose)).toBe("A custom board agreement");
  });
});
