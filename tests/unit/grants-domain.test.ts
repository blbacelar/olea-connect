import { describe, expect, it } from "vitest";

import {
  assertAwardWithinBudget,
  countWords,
  validateGrantApplication,
  type GrantApplicationInput,
  type GrantEligibilityContext,
} from "@/lib/grants/domain";

const validInput: GrantApplicationInput = {
  annualRevenueCents: 250_000_00,
  craGoodStanding: true,
  expectedOutcome: "We will publish an updated board recruitment package.",
  focusArea: "governance_strengthening",
  fundingRequest: Array.from({ length: 160 }, (_, index) => `word${index}`).join(
    " ",
  ),
  registeredInCanada: true,
  requestedAmountCents: 50_000,
};

const openContext: GrantEligibilityContext = {
  applicationClosesAt: new Date(Date.now() + 86_400_000).toISOString(),
  applicationOpensAt: new Date(Date.now() - 86_400_000).toISOString(),
  organizationCountryCode: "CA",
  organizationCraGoodStanding: true,
  organizationRegistrationNumber: "123456789",
  roundAwardAmountCents: 50_000,
  roundBudgetCents: 150_000,
  roundStatus: "open",
  subscriptionStatus: "active",
};

const awardConstraint = {
  amountCents: 50_000,
  awardAmountCents: 50_000,
  existingAwardCount: 0,
  existingAwardTotalCents: 0,
  requestedAmountCents: 50_000,
  roundAvailableAwards: 3,
  roundBudgetCents: 150_000,
};

describe("grant domain rules", () => {
  it("counts trimmed narrative words", () => {
    expect(countWords(" one  two\nthree ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });

  it("accepts an eligible 150-250 word submission", () => {
    expect(validateGrantApplication(validInput, openContext, "submit")).toEqual(
      [],
    );
  });

  it("blocks late or ineligible submissions server-side", () => {
    const errors = validateGrantApplication(
      {
        ...validInput,
        craGoodStanding: false,
        registeredInCanada: false,
      },
      {
        ...openContext,
        applicationClosesAt: new Date(Date.now() - 86_400_000).toISOString(),
        organizationCountryCode: "US",
        organizationCraGoodStanding: false,
        organizationRegistrationNumber: null,
        subscriptionStatus: "canceled",
      },
      "submit",
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        "An active Olea membership is required to apply.",
        "This grant round is not accepting applications.",
        "Applicants must be registered Canadian organizations.",
        "CRA good standing must be confirmed before submission.",
      ]),
    );
  });

  it("requires submitted narratives to stay inside the word-count window", () => {
    expect(
      validateGrantApplication(
        {
          ...validInput,
          fundingRequest: Array.from(
            { length: 149 },
            (_, index) => `word${index}`,
          ).join(" "),
        },
        openContext,
        "submit",
      ),
    ).toContain("Narrative must be between 150 and 250 words.");
  });

  it("prevents awards from exceeding the round budget", () => {
    expect(() =>
      assertAwardWithinBudget({
        ...awardConstraint,
        existingAwardTotalCents: 100_000,
        amountCents: 50_001,
        awardAmountCents: 60_000,
        requestedAmountCents: 60_000,
      }),
    ).toThrow("Award total cannot exceed the round budget.");
  });

  it("prevents awards above requested, advertised, or count limits", () => {
    expect(() =>
      assertAwardWithinBudget({
        ...awardConstraint,
        amountCents: 60_000,
      }),
    ).toThrow("Award amount cannot exceed the requested amount.");

    expect(() =>
      assertAwardWithinBudget({
        ...awardConstraint,
        amountCents: 55_000,
        requestedAmountCents: 60_000,
      }),
    ).toThrow("Award amount cannot exceed the round award amount.");

    expect(() =>
      assertAwardWithinBudget({
        ...awardConstraint,
        existingAwardCount: 3,
      }),
    ).toThrow("Award count cannot exceed the round limit.");
  });
});
