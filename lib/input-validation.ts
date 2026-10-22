import {
  decimalStringSchema,
  emailStringSchema,
  formBooleanValueSchema,
  httpUrlStringSchema,
  integerStringSchema,
  isoDateStringSchema,
  phoneStringSchema,
} from "@/lib/validation/schemas";

export const PHONE_INPUT_PATTERN = String.raw`\+?[0-9().\-\s]{7,24}`;

export function sanitizePhoneInput(value: string) {
  const filtered = value.replace(/[^0-9+().\-\s]/g, "");
  const hasLeadingPlus = filtered.startsWith("+");
  const withoutExtraPluses = filtered.replace(/\+/g, "");
  return `${hasLeadingPlus ? "+" : ""}${withoutExtraPluses}`;
}

/** Formats complete North American numbers without changing incomplete input. */
export function formatPhoneInput(value: string) {
  const normalized = sanitizePhoneInput(value).trim();
  if (!normalized) return "";

  const hasLeadingPlus = normalized.startsWith("+");
  const digits = normalized.replace(/\D/g, "");
  const hasCountryCode = digits.length === 11 && digits.startsWith("1");
  const localDigits = hasCountryCode ? digits.slice(1) : digits;

  if (localDigits.length !== 10) return normalized;

  const countryPrefix = hasCountryCode ? `${hasLeadingPlus ? "+" : ""}1 ` : "";
  return `${countryPrefix}(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
}

export function formatEmailInput(value: string) {
  return value.trim().toLowerCase();
}

export function formatUrlInput(value: string) {
  return value.trim();
}

export function isValidPhoneNumber(value: string) {
  const normalized = value.trim();
  return !normalized || phoneStringSchema.safeParse(normalized).success;
}

export function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizeDecimalInput(value: string, maxDecimals = 2) {
  const filtered = value.replace(/[^0-9.]/g, "");
  const [integerPart = "", ...fractionParts] = filtered.split(".");
  const fraction = fractionParts.join("").slice(0, maxDecimals);
  if (!fractionParts.length) return integerPart;
  return `${integerPart || "0"}.${fraction}`;
}

export function isValidDecimalInput(value: string, maxDecimals = 2) {
  return decimalStringSchema(maxDecimals).safeParse(value).success;
}

export function isValidIntegerInput(value: string) {
  return integerStringSchema.safeParse(value).success;
}

export function formatCurrencyInput(value: string, currency = "CAD") {
  const normalized = sanitizeDecimalInput(value);
  if (!normalized || normalized === ".") return "";

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return "";

  return new Intl.NumberFormat("en-CA", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export function normalizeEmail(value: string, label = "Email") {
  const result = emailStringSchema.safeParse(value);
  if (!result.success) throw new Error(`${label} must be a valid email address.`);
  return result.data;
}

export function normalizeOptionalEmail(value: string | null | undefined, label = "Email") {
  const normalized = value?.trim();
  return normalized ? normalizeEmail(normalized, label) : null;
}

export function normalizePhone(value: string, label = "Phone") {
  const normalized = value.replace(/\s+/g, " ").trim();
  const result = phoneStringSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`${label} must be a valid phone number.`);
  }
  return result.data;
}

export function normalizeOptionalPhone(value: string | null | undefined, label = "Phone") {
  const normalized = value?.trim();
  return normalized ? normalizePhone(normalized, label) : null;
}

export function normalizeHttpUrl(value: string, label = "URL") {
  const result = httpUrlStringSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} must be a valid http or https URL.`);
  }
  return new URL(result.data).toString();
}

export function normalizeOptionalHttpUrl(value: string | null | undefined, label = "URL") {
  const normalized = value?.trim();
  return normalized ? normalizeHttpUrl(normalized, label) : null;
}

export function parseStrictInteger(value: string, label: string, minimum = 0) {
  const normalized = value.trim();
  const result = integerStringSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`${label} must contain numbers only.`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${label} must be at least ${minimum}.`);
  }
  return parsed;
}

export function parseStrictDecimal(value: string, label: string, minimum = 0) {
  const normalized = value.trim();
  const result = decimalStringSchema().safeParse(normalized);
  if (!result.success) {
    throw new Error(`${label} must contain a number with up to 2 decimals.`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`${label} must be at least ${minimum}.`);
  }
  return parsed;
}

export function parseFormBoolean(value: FormDataEntryValue | null, label: string) {
  const result = formBooleanValueSchema.safeParse(value === null ? null : value);
  if (!result.success) throw new Error(`${label} must be true or false.`);
  if (result.data === null || result.data === "false") return false;
  if (result.data === "on" || result.data === "true") return true;
  throw new Error(`${label} must be true or false.`);
}

export function parseIsoDate(value: string, label: string) {
  const normalized = value.trim();
  const result = isoDateStringSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`${label} must be a valid date.`);
  }
  return new Date(`${result.data}T00:00:00.000Z`);
}
