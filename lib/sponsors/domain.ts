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
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized) return 0;

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;

  return Math.round(amount * 100);
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
  const hasPhoneShape = /^\+?[\d().\-\s]{7,}(?:\s*(?:x|ext)\.?\s*\d{1,6})?$/i.test(
    normalized,
  );

  if (!hasPhoneShape || digits.length < 7 || digits.length > 20) {
    throw new Error(`${label} must be a valid phone number.`);
  }

  return normalized;
}
