import {
  normalizeEmail,
  normalizeHttpUrl,
  normalizePhone,
} from "@/lib/input-validation";
import { decimalStringSchema } from "@/lib/validation/schemas";

export type SponsorContributionReconciliationInput = {
  allocatedAmountCents: number;
  amountCents: number;
};

export type SponsorContributionReconciliation = {
  allocatedAmountCents: number;
  contributionAmountCents: number;
  isReconciled: boolean;
  unallocatedAmountCents: number;
};

export function summarizeContributionReconciliation(
  contributions: SponsorContributionReconciliationInput[],
): SponsorContributionReconciliation {
  const contributionAmountCents = contributions.reduce(
    (total, contribution) => total + contribution.amountCents,
    0,
  );
  const allocatedAmountCents = contributions.reduce(
    (total, contribution) => total + contribution.allocatedAmountCents,
    0,
  );

  return {
    allocatedAmountCents,
    contributionAmountCents,
    isReconciled: allocatedAmountCents === contributionAmountCents,
    unallocatedAmountCents: contributionAmountCents - allocatedAmountCents,
  };
}

export function canViewPrivateSponsorFinancials(
  platformRoles: readonly string[],
) {
  return (
    platformRoles.includes("super_admin") ||
    platformRoles.includes("finance_admin")
  );
}

export function normalizeSponsorSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function parseCurrencyToCents(value: string) {
  const normalizedInput = value.trim();
  if (!normalizedInput) return 0;
  if (!decimalStringSchema(2).safeParse(normalizedInput).success) return 0;

  const amount = Number(normalizedInput);
  if (!Number.isFinite(amount) || amount < 0) return 0;

  return Math.round(amount * 100);
}

export function validateCurrencyToCents(value: string, label = "Amount") {
  const normalizedInput = value.trim();
  if (!normalizedInput) {
    throw new Error(`${label} is required.`);
  }

  const cents = parseCurrencyToCents(normalizedInput);
  if (cents <= 0) {
    throw new Error(`${label} must contain numbers only, with up to 2 decimals.`);
  }

  return cents;
}

export function validateOptionalCurrencyToCents(
  value: string,
  label = "Amount",
) {
  const normalizedInput = value.trim();
  if (!normalizedInput) return 0;

  const cents = parseCurrencyToCents(normalizedInput);
  if (cents <= 0) {
    throw new Error(`${label} must contain numbers only, with up to 2 decimals.`);
  }

  return cents;
}

export function normalizeOptionalHttpUrl(value: string | null) {
  if (!value) return null;

  try {
    return normalizeHttpUrl(value);
  } catch {
    return null;
  }
}

export function validateOptionalHttpUrl(value: string | null, label = "URL") {
  if (!value) return null;

  const normalized = normalizeOptionalHttpUrl(value);
  if (!normalized) {
    throw new Error(`${label} must be a valid http or https URL.`);
  }

  return normalized;
}

export function normalizeOptionalEmail(value: string | null, label = "Email") {
  if (!value) return null;

  return normalizeEmail(value, label);
}

export function normalizeOptionalPhone(value: string | null, label = "Phone") {
  if (!value) return null;

  return normalizePhone(value, label);
}
