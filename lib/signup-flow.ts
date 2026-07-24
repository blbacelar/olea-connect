import type { RegistrationState } from "@/lib/types";
import {
  normalizeEmail,
  normalizeOptionalPhone,
} from "@/lib/input-validation";
import { normalizeReferralCode } from "@/lib/referral-capture";

export const CANADIAN_PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

export const ORGANIZATION_KINDS = [
  "nonprofit",
  "registered_charity",
  "society",
  "community_organization",
  "foundation",
  "other",
] as const;

export const ANNUAL_BUDGET_RANGES = [
  "under-250k",
  "250k-500k",
  "500k-1m",
  "1m-2m",
  "2m-5m",
  "over-5m",
] as const;

export const BOARD_SIZE_RANGES = [
  "3-5",
  "6-10",
  "11-15",
  "16-20",
  "20plus",
] as const;

export const ACQUISITION_SOURCES = [
  "referral",
  "web-search",
  "social-media",
  "webinar",
  "sponsor",
  "word-of-mouth",
  "other",
] as const;

export type SignupCheckoutInput = {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  province: (typeof CANADIAN_PROVINCES)[number];
  organizationKind: (typeof ORGANIZATION_KINDS)[number];
  annualBudgetRange: (typeof ANNUAL_BUDGET_RANGES)[number];
  boardSizeRange: (typeof BOARD_SIZE_RANGES)[number];
  phone: string;
  acquisitionSource: (typeof ACQUISITION_SOURCES)[number] | "";
  referralCode: string;
  tier: RegistrationState["tier"];
  billingCycle: RegistrationState["billingCycle"];
  consents: RegistrationState["consents"];
};

export class SignupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignupValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new SignupValidationError(`Unexpected ${label} field.`);
  }
}

export function parseSignupCheckoutInput(value: unknown): SignupCheckoutInput {
  if (!isRecord(value)) {
    throw new SignupValidationError("Invalid checkout payload.");
  }

  assertExactKeys(
    value,
    [
      "email",
      "password",
      "fullName",
      "organizationName",
      "province",
      "organizationKind",
      "annualBudgetRange",
      "boardSizeRange",
      "phone",
      "acquisitionSource",
      "referralCode",
      "tier",
      "billingCycle",
      "consents",
    ],
    "checkout",
  );

  const rawEmail = typeof value.email === "string" ? value.email : "";
  const password = typeof value.password === "string" ? value.password : "";
  const fullName = typeof value.fullName === "string" ? value.fullName.trim() : "";
  const organizationName =
    typeof value.organizationName === "string" ? value.organizationName.trim() : "";
  const rawPhone = typeof value.phone === "string" ? value.phone : "";
  const rawReferralCode =
    typeof value.referralCode === "string" ? value.referralCode.trim() : "";
  const referralCode = normalizeReferralCode(rawReferralCode);

  let email: string;
  let phone: string;
  try {
    email = normalizeEmail(rawEmail);
  } catch {
    throw new SignupValidationError("Enter a valid email address.");
  }
  try {
    phone = normalizeOptionalPhone(rawPhone) ?? "";
  } catch {
    throw new SignupValidationError("Enter a valid phone number.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new SignupValidationError("Password must be between 8 and 128 characters.");
  }
  if (fullName.length < 2 || fullName.length > 160) {
    throw new SignupValidationError("Enter your full name.");
  }
  if (organizationName.length < 2 || organizationName.length > 180) {
    throw new SignupValidationError("Enter a valid organization name.");
  }
  if (!isOneOf(value.province, CANADIAN_PROVINCES)) {
    throw new SignupValidationError("Select a valid Canadian province or territory.");
  }
  if (!isOneOf(value.organizationKind, ORGANIZATION_KINDS)) {
    throw new SignupValidationError("Select an organization type.");
  }
  if (!isOneOf(value.annualBudgetRange, ANNUAL_BUDGET_RANGES)) {
    throw new SignupValidationError("Select an annual budget range.");
  }
  if (!isOneOf(value.boardSizeRange, BOARD_SIZE_RANGES)) {
    throw new SignupValidationError("Select an approximate board size.");
  }
  if (rawReferralCode && !referralCode) {
    throw new SignupValidationError("Enter a valid referral code.");
  }
  if (value.acquisitionSource !== "" && !isOneOf(value.acquisitionSource, ACQUISITION_SOURCES)) {
    throw new SignupValidationError("Select a valid acquisition source.");
  }
  if (!isOneOf(value.tier, ["seedling", "roots", "canopy", "harvest"] as const)) {
    throw new SignupValidationError("Select a valid membership plan.");
  }
  if (!isOneOf(value.billingCycle, ["quarterly", "annual"] as const)) {
    throw new SignupValidationError("Select a valid billing cadence.");
  }
  if (!isRecord(value.consents)) {
    throw new SignupValidationError("Review and accept all required policies.");
  }
  assertExactKeys(
    value.consents,
    ["terms", "privacy", "dataOwnership", "confidentiality"],
    "consent",
  );
  if (
    value.consents.terms !== true ||
    value.consents.privacy !== true ||
    value.consents.dataOwnership !== true ||
    value.consents.confidentiality !== true
  ) {
    throw new SignupValidationError("Review and accept all required policies.");
  }

  return {
    email,
    password,
    fullName,
    organizationName,
    province: value.province,
    organizationKind: value.organizationKind,
    annualBudgetRange: value.annualBudgetRange,
    boardSizeRange: value.boardSizeRange,
    phone,
    acquisitionSource:
      value.acquisitionSource === "" ? "" : value.acquisitionSource,
    referralCode,
    tier: value.tier,
    billingCycle: value.billingCycle,
    consents: value.consents as RegistrationState["consents"],
  };
}
