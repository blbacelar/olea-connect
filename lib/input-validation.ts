export const PHONE_INPUT_PATTERN = String.raw`\+?[0-9().\-\s]{7,24}`;

const phonePattern = new RegExp(`^${PHONE_INPUT_PATTERN}$`);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const decimalPattern = /^\d+(?:\.\d{0,2})?$/;
const integerPattern = /^\d+$/;
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function sanitizePhoneInput(value: string) {
  const filtered = value.replace(/[^0-9+().\-\s]/g, "");
  const hasLeadingPlus = filtered.startsWith("+");
  const withoutExtraPluses = filtered.replace(/\+/g, "");
  return `${hasLeadingPlus ? "+" : ""}${withoutExtraPluses}`;
}

export function isValidPhoneNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  const digits = normalized.replace(/\D/g, "");
  return (
    phonePattern.test(normalized) &&
    digits.length >= 7 &&
    digits.length <= 20
  );
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
  const fraction = value.split(".")[1];
  return decimalPattern.test(value) && (fraction === undefined || fraction.length <= maxDecimals);
}

export function isValidIntegerInput(value: string) {
  return integerPattern.test(value);
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
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > 254 || !emailPattern.test(normalized)) {
    throw new Error(`${label} must be a valid email address.`);
  }
  return normalized;
}

export function normalizeOptionalEmail(value: string | null | undefined, label = "Email") {
  const normalized = value?.trim();
  return normalized ? normalizeEmail(normalized, label) : null;
}

export function normalizePhone(value: string, label = "Phone") {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!isValidPhoneNumber(normalized)) {
    throw new Error(`${label} must be a valid phone number.`);
  }
  return normalized;
}

export function normalizeOptionalPhone(value: string | null | undefined, label = "Phone") {
  const normalized = value?.trim();
  return normalized ? normalizePhone(normalized, label) : null;
}

export function normalizeHttpUrl(value: string, label = "URL") {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label} must be a valid http or https URL.`);
  }
}

export function normalizeOptionalHttpUrl(value: string | null | undefined, label = "URL") {
  const normalized = value?.trim();
  return normalized ? normalizeHttpUrl(normalized, label) : null;
}

export function parseStrictInteger(value: string, label: string, minimum = 0) {
  const normalized = value.trim();
  if (!isValidIntegerInput(normalized)) {
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
  if (!isValidDecimalInput(normalized)) {
    throw new Error(`${label} must contain a number with up to 2 decimals.`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`${label} must be at least ${minimum}.`);
  }
  return parsed;
}

export function parseFormBoolean(value: FormDataEntryValue | null, label: string) {
  if (value === null) return false;
  if (value === "on" || value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${label} must be true or false.`);
}

export function parseIsoDate(value: string, label: string) {
  const normalized = value.trim();
  const match = isoDatePattern.exec(normalized);
  if (!match) {
    throw new Error(`${label} must be a valid date.`);
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error(`${label} must be a valid date.`);
  }

  return parsed;
}
