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

export const SPONSOR_CURRENCY_PATTERN_SOURCE =
  "(?:CAD\\s*)?\\$?(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,2})?";

const currencyFormatPattern = new RegExp(
  `^${SPONSOR_CURRENCY_PATTERN_SOURCE}$`,
  "i",
);

export function parseCurrencyToCents(value: string) {
  const normalizedInput = value.trim();
  if (!normalizedInput) return 0;
  if (!currencyFormatPattern.test(normalizedInput)) return 0;

  const normalized = normalizedInput.replace(/CAD|[$,\s]/gi, "");
  if (!normalized) return 0;

  const amount = Number(normalized);
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
    throw new Error(`${label} must be a valid CAD amount like $1,200.00.`);
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
    throw new Error(`${label} must be a valid CAD amount like $1,200.00.`);
  }

  return cents;
}

export function normalizeOptionalHttpUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
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

  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error(`${label} must be a valid email address.`);
  }

  return normalized;
}

export function normalizeOptionalPhone(value: string | null, label = "Phone") {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  const digits = normalized.replace(/\D/g, "");
  const hasPhoneShape =
    /^\+?[\d().\-\s]{7,}(?:\s*(?:x|ext)\.?\s*\d{1,6})?$/i.test(normalized);

  if (!hasPhoneShape || digits.length < 7 || digits.length > 20) {
    throw new Error(`${label} must be a valid phone number.`);
  }

  return normalized;
}
