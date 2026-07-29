import type { RegistrationState } from "@/lib/types";
import { normalizeReferralCode } from "@/lib/referral-capture";
import * as z from "zod";
import {
  emailStringSchema,
  nonEmptyTextSchema,
  phoneStringSchema,
} from "@/lib/validation/schemas";

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

const signupCheckoutSchema = z
  .object({
    email: emailStringSchema,
    password: z.string().min(8).max(128),
    fullName: nonEmptyTextSchema(160, 2),
    organizationName: nonEmptyTextSchema(180, 2),
    province: z.enum(CANADIAN_PROVINCES),
    organizationKind: z.enum(ORGANIZATION_KINDS),
    annualBudgetRange: z.enum(ANNUAL_BUDGET_RANGES),
    boardSizeRange: z.enum(BOARD_SIZE_RANGES),
    phone: z.union([z.literal(""), phoneStringSchema]),
    acquisitionSource: z.union([z.literal(""), z.enum(ACQUISITION_SOURCES)]),
    referralCode: z.string().trim().transform((value, ctx) => {
      const normalized = normalizeReferralCode(value);
      if (value && !normalized) {
        ctx.addIssue({ code: "custom", message: "Enter a valid referral code." });
        return z.NEVER;
      }
      return normalized;
    }),
    tier: z.enum(["seedling", "roots", "canopy", "harvest"]),
    billingCycle: z.enum(["quarterly", "annual"]),
    consents: z
      .object({
        terms: z.literal(true),
        privacy: z.literal(true),
        dataOwnership: z.literal(true),
        confidentiality: z.literal(true),
      })
      .strict(),
  })
  .strict();

export type SignupCheckoutInput = z.infer<typeof signupCheckoutSchema> & {
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

export function parseSignupCheckoutInput(value: unknown): SignupCheckoutInput {
  const result = signupCheckoutSchema.safeParse(value);
  if (result.success) return result.data as SignupCheckoutInput;

  const issue = result.error.issues[0];
  if (issue?.code === "unrecognized_keys") {
    if (issue.path[0] === "consents") {
      throw new SignupValidationError("Unexpected consent field.");
    }
    throw new SignupValidationError("Unexpected checkout field.");
  }
  if (issue?.path[0] === "email") throw new SignupValidationError("Enter a valid email address.");
  if (issue?.path[0] === "phone") throw new SignupValidationError("Enter a valid phone number.");
  if (issue?.path[0] === "consents") {
    throw new SignupValidationError("Review and accept all required policies.");
  }
  if (issue?.path[0] === "password") {
    throw new SignupValidationError("Password must be between 8 and 128 characters.");
  }
  throw new SignupValidationError(issue?.message ?? "Invalid checkout payload.");
}
