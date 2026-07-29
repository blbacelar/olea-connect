import * as z from "zod";

const phoneCharacters = /^\+?[0-9().\-\s]+$/;
const integerCharacters = /^\d+$/;
const isoDateCharacters = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Shared schemas validate untrusted values before they reach domain logic or persistence.
 * Keep these schemas free of UI concerns so they can be used by server actions and tests.
 */
export const phoneStringSchema = z
  .string()
  .trim()
  .min(7, "must contain at least 7 characters")
  .max(24, "must contain 24 characters or fewer")
  .regex(phoneCharacters, "must contain phone characters only")
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 20;
    },
    "must contain between 7 and 20 digits",
  );

export const emailStringSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "must contain 254 characters or fewer")
  .email("must be a valid email address");

export const integerStringSchema = z
  .string()
  .trim()
  .regex(integerCharacters, "must contain numbers only");

export function decimalStringSchema(maxDecimals = 2) {
  return z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d+(?:\\.\\d{0,${maxDecimals}})?$`),
      `must contain a number with up to ${maxDecimals} decimals`,
    );
}

export const httpUrlStringSchema = z
  .string()
  .trim()
  .url("must be a valid URL")
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "must use http or https");

export const isoDateStringSchema = z
  .string()
  .trim()
  .regex(isoDateCharacters, "must use YYYY-MM-DD format")
  .refine((value) => {
    const match = isoDateCharacters.exec(value);
    if (!match) return false;

    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return (
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day)
    );
  }, "must be a valid calendar date");

export const formBooleanValueSchema = z
  .union([z.literal("on"), z.literal("true"), z.literal("false")])
  .nullable();

export function nonEmptyTextSchema(maxLength: number, minLength = 1) {
  return z
    .string()
    .trim()
    .min(minLength, `must contain at least ${minLength} characters`)
    .max(maxLength, `must contain ${maxLength} characters or fewer`);
}

export function optionalTextSchema(maxLength: number) {
  return z.string().trim().max(maxLength, `must contain ${maxLength} characters or fewer`);
}
