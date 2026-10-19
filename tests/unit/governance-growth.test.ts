import { describe, expect, it } from "vitest";

import {
  aggregateEvaluationScores,
  canCloseBoardEvaluation,
  canManageBoardEvaluationActions,
  canShowBoardEvaluationResults,
  evaluationQuestions,
  nextAvailableEvaluationYear,
  parseEvaluationScores,
} from "@/lib/board-evaluation/domain";
import {
  hasGovernanceFeature,
  type GovernanceSubscription,
} from "@/lib/governance-growth/entitlements";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import { aggregatePartnerRegions } from "@/lib/sponsors/impact";

const now = new Date("2026-10-19T12:00:00Z");
const subscription = (overrides: Partial<GovernanceSubscription> = {}): GovernanceSubscription => ({
  plan_id: "roots",
  status: "active",
  current_period_end: "2027-10-19T12:00:00Z",
  subscription_items: [],
  ...overrides,
});

describe("governance growth entitlement", () => {
  it("includes evaluation for Roots and planning/training for Canopy", () => {
    expect(hasGovernanceFeature("board_evaluation", subscription(), now)).toBe(true);
    expect(hasGovernanceFeature("strategic_planning", subscription(), now)).toBe(false);
    expect(hasGovernanceFeature("board_training", subscription({ plan_id: "canopy" }), now)).toBe(true);
  });

  it("accepts active add-ons but blocks expired or canceled subscriptions", () => {
    const withAddon = subscription({ subscription_items: [{ item_type: "strategic_planning", active: true }] });
    expect(hasGovernanceFeature("strategic_planning", withAddon, now)).toBe(true);
    expect(hasGovernanceFeature("strategic_planning", subscription({
      subscription_items: [{ item_type: "strategic_planning", active: false }],
    }), now)).toBe(false);
    expect(hasGovernanceFeature("board_evaluation", subscription({ status: "canceled" }), now)).toBe(false);
    expect(hasGovernanceFeature("board_evaluation", subscription({ current_period_end: now.toISOString() }), now)).toBe(false);
  });
});

describe("board evaluation scoring", () => {
  const allScores = (rating: number) => Object.fromEntries(
    evaluationQuestions.map(({ id }) => [id, rating]),
  );

  it("rejects missing and out-of-range ratings before saving", () => {
    expect(() => parseEvaluationScores({})).toThrow();
    expect(() => parseEvaluationScores(allScores(0))).toThrow();
    expect(() => parseEvaluationScores(allScores(6))).toThrow();
    expect(() => parseEvaluationScores(allScores(3.5))).toThrow();
  });

  it("calculates a per-topic mean from valid responses", () => {
    const result = aggregateEvaluationScores([
      parseEvaluationScores(allScores(2)),
      parseEvaluationScores(allScores(3)),
      parseEvaluationScores(allScores(5)),
    ]);
    expect(result).toHaveLength(evaluationQuestions.length);
    expect(result.every((item) => item.average === 3.3)).toBe(true);
  });

  it("keeps means private until three responses and the cycle has closed", () => {
    expect(canCloseBoardEvaluation(2)).toBe(false);
    expect(canCloseBoardEvaluation(3)).toBe(true);
    expect(canShowBoardEvaluationResults("open", 3)).toBe(false);
    expect(canShowBoardEvaluationResults("closed", 2)).toBe(false);
    expect(canShowBoardEvaluationResults("closed", 3)).toBe(true);
  });

  it("allows improvement actions only after evaluation closure", () => {
    expect(canManageBoardEvaluationActions("open")).toBe(false);
    expect(canManageBoardEvaluationActions("closed")).toBe(true);
  });

  it("suggests the next unused annual evaluation year", () => {
    expect(nextAvailableEvaluationYear([], 2026)).toBe(2026);
    expect(nextAvailableEvaluationYear([2026], 2026)).toBe(2027);
    expect(nextAvailableEvaluationYear([2026, 2027], 2026)).toBe(2028);
    expect(nextAvailableEvaluationYear([2024], 2026)).toBe(2026);
    expect(nextAvailableEvaluationYear([2100], 2100)).toBeNull();
  });
});

describe("French governance copy", () => {
  it("translates core module actions and assessment questions", () => {
    expect(translateFrenchUiText("Board Evaluation")).toBe("Évaluation du conseil");
    expect(translateFrenchUiText("Annual Board Evaluation")).toBe("Évaluation annuelle du conseil");
    expect(translateFrenchUiText("Close evaluation and show results")).toBe("Clore l'évaluation et afficher les résultats");
    expect(translateFrenchUiText("Edit strategic goal")).toBe("Modifier l'objectif stratégique");
    expect(translateFrenchUiText("Edit improvement action")).toBe("Modifier l'action d'amélioration");
    expect(translateFrenchUiText("No strategic goals have been added yet.")).toBe("Aucun objectif stratégique n'a encore été ajouté.");
    expect(translateFrenchUiText("Activate funded year")).toBe("Activer l'année financée");
    expect(translateFrenchUiText(evaluationQuestions[0].en)).toBe(evaluationQuestions[0].fr);
  });
});

describe("sponsor impact privacy", () => {
  it("shows only sufficiently large region groups from this sponsorship", () => {
    const result = aggregatePartnerRegions([
      { sponsorshipId: "a", region: "BC", status: "active" },
      { sponsorshipId: "a", region: "BC", status: "active" },
      { sponsorshipId: "a", region: "BC", status: "completed" },
      { sponsorshipId: "a", region: "ON", status: "active" },
      { sponsorshipId: "b", region: "ON", status: "active" },
      { sponsorshipId: "a", region: "BC", status: "canceled" },
    ], "a");
    expect(result).toEqual([{ region: "BC", count: 3 }]);
  });
});
