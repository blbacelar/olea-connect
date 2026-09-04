export const grantFocusAreas = [
  "operational_capacity",
  "governance_strengthening",
  "program_rollout",
  "communications_outreach",
] as const;

export const grantApplicationStatuses = [
  "draft",
  "submitted",
  "in_review",
  "shortlisted",
  "approved",
  "declined",
  "withdrawn",
] as const;

export const grantAwardStatuses = [
  "approved",
  "scheduled",
  "paid",
  "canceled",
] as const;

export type GrantFocusArea = (typeof grantFocusAreas)[number];
export type GrantApplicationStatus = (typeof grantApplicationStatuses)[number];
export type GrantAwardStatus = (typeof grantAwardStatuses)[number];
export type GrantRoundStatus =
  | "draft"
  | "upcoming"
  | "open"
  | "reviewing"
  | "awarded"
  | "closed";

export const grantFocusAreaLabels: Record<GrantFocusArea, string> = {
  communications_outreach: "Communications and outreach",
  governance_strengthening: "Governance strengthening",
  operational_capacity: "Operational capacity",
  program_rollout: "Program rollout",
};

export const grantStatusLabels: Record<GrantApplicationStatus, string> = {
  approved: "Approved",
  declined: "Declined",
  draft: "Draft",
  in_review: "In review",
  shortlisted: "Shortlisted",
  submitted: "Submitted",
  withdrawn: "Withdrawn",
};

export type GrantApplicationInput = {
  annualRevenueCents: number | null;
  craGoodStanding: boolean;
  expectedOutcome: string;
  focusArea: string;
  fundingRequest: string;
  registeredInCanada: boolean;
  requestedAmountCents: number;
};

export type GrantEligibilityContext = {
  applicationClosesAt: string;
  applicationOpensAt: string;
  organizationCountryCode: string | null;
  organizationCraGoodStanding: boolean | null;
  organizationRegistrationNumber: string | null;
  roundAwardAmountCents: number;
  roundBudgetCents: number;
  roundStatus: GrantRoundStatus;
  subscriptionStatus: string | null;
};

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
type GrantValidationRule = {
  isInvalid: () => boolean;
  message: string;
};

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function isGrantFocusArea(value: string): value is GrantFocusArea {
  return grantFocusAreas.includes(value as GrantFocusArea);
}

export function validateGrantApplication(
  input: GrantApplicationInput,
  context: GrantEligibilityContext,
  mode: "draft" | "submit",
) {
  const errors: string[] = [];
  const now = Date.now();
  const opensAt = new Date(context.applicationOpensAt).getTime();
  const closesAt = new Date(context.applicationClosesAt).getTime();

  for (const rule of getGrantValidationRules({
    closesAt,
    context,
    input,
    mode,
    now,
    opensAt,
  })) {
    if (rule.isInvalid()) errors.push(rule.message);
  }

  return errors;
}

function getGrantValidationRules({
  closesAt,
  context,
  input,
  mode,
  now,
  opensAt,
}: {
  closesAt: number;
  context: GrantEligibilityContext;
  input: GrantApplicationInput;
  mode: "draft" | "submit";
  now: number;
  opensAt: number;
}): GrantValidationRule[] {
  return [
    ...getBaseGrantValidationRules({ closesAt, context, input, now, opensAt }),
    ...getSubmissionGrantValidationRules(input, mode),
  ];
}

function getBaseGrantValidationRules({
  closesAt,
  context,
  input,
  now,
  opensAt,
}: {
  closesAt: number;
  context: GrantEligibilityContext;
  input: GrantApplicationInput;
  now: number;
  opensAt: number;
}): GrantValidationRule[] {
  return [
    {
      isInvalid: () =>
        !activeSubscriptionStatuses.has(context.subscriptionStatus ?? ""),
      message: "An active Olea membership is required to apply.",
    },
    {
      isInvalid: () =>
        context.roundStatus !== "open" || now < opensAt || now > closesAt,
      message: "This grant round is not accepting applications.",
    },
    {
      isInvalid: () => !isRegisteredCanadianApplicant(input, context),
      message: "Applicants must be registered Canadian organizations.",
    },
    {
      isInvalid: () => !hasCraGoodStanding(input, context),
      message: "CRA good standing must be confirmed before submission.",
    },
    {
      isInvalid: () => !isGrantFocusArea(input.focusArea),
      message: "Choose a supported focus area.",
    },
    {
      isInvalid: () => !isRequestedAmountWithinRound(input, context),
      message: "Requested amount must be within the round award amount.",
    },
    {
      isInvalid: () => !isValidAnnualRevenue(input.annualRevenueCents),
      message: "Annual revenue must be zero or greater.",
    },
  ];
}

function getSubmissionGrantValidationRules(
  input: GrantApplicationInput,
  mode: "draft" | "submit",
): GrantValidationRule[] {
  if (mode !== "submit") return [];

  return [
    {
      isInvalid: () => !isFundingNarrativeWordCountValid(input.fundingRequest),
      message: "Narrative must be between 150 and 250 words.",
    },
    {
      isInvalid: () => input.expectedOutcome.trim().length < 20,
      message: "Expected outcome must be at least 20 characters.",
    },
  ];
}

function isRegisteredCanadianApplicant(
  input: GrantApplicationInput,
  context: GrantEligibilityContext,
) {
  return (
    context.organizationCountryCode === "CA" &&
    input.registeredInCanada &&
    Boolean(context.organizationRegistrationNumber)
  );
}

function hasCraGoodStanding(
  input: GrantApplicationInput,
  context: GrantEligibilityContext,
) {
  return input.craGoodStanding && context.organizationCraGoodStanding !== false;
}

function isRequestedAmountWithinRound(
  input: GrantApplicationInput,
  context: GrantEligibilityContext,
) {
  return (
    Number.isInteger(input.requestedAmountCents) &&
    input.requestedAmountCents > 0 &&
    input.requestedAmountCents <= context.roundAwardAmountCents
  );
}

function isValidAnnualRevenue(annualRevenueCents: number | null) {
  return (
    annualRevenueCents === null ||
    (Number.isInteger(annualRevenueCents) && annualRevenueCents >= 0)
  );
}

function isFundingNarrativeWordCountValid(fundingRequest: string) {
  const fundingWordCount = countWords(fundingRequest);
  return fundingWordCount >= 150 && fundingWordCount <= 250;
}

export function assertAwardWithinBudget({
  amountCents,
  awardAmountCents,
  existingAwardCount,
  existingAwardTotalCents,
  requestedAmountCents,
  roundAvailableAwards,
  roundBudgetCents,
}: {
  amountCents: number;
  awardAmountCents: number;
  existingAwardCount: number;
  existingAwardTotalCents: number;
  requestedAmountCents: number;
  roundAvailableAwards: number;
  roundBudgetCents: number;
}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Award amount must be greater than zero.");
  }

  if (amountCents > requestedAmountCents) {
    throw new Error("Award amount cannot exceed the requested amount.");
  }

  if (amountCents > awardAmountCents) {
    throw new Error("Award amount cannot exceed the round award amount.");
  }

  if (existingAwardCount >= roundAvailableAwards) {
    throw new Error("Award count cannot exceed the round limit.");
  }

  if (existingAwardTotalCents + amountCents > roundBudgetCents) {
    throw new Error("Award total cannot exceed the round budget.");
  }
}
