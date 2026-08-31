import { randomBytes } from "node:crypto";

import * as z from "zod";

import { normalizeReferralCode } from "@/lib/referral-capture";
import {
  decimalStringSchema,
  emailStringSchema,
  formBooleanValueSchema,
  httpUrlStringSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
} from "@/lib/validation/schemas";

export const referralReferrerStatuses = [
  "pending",
  "approved",
  "rejected",
  "suspended",
  "archived",
] as const;

export const referralStatuses = [
  "lead_created",
  "demo_booked",
  "demo_attended",
  "subscription_started",
  "retained",
  "payout_eligible",
  "paid",
  "rejected",
] as const;

export const referralPayoutStatuses = [
  "pending",
  "eligible",
  "paid",
  "rejected",
] as const;

export const referralPayoutMilestones = ["demo_attended", "retained"] as const;

export type ReferralReferrerStatus = (typeof referralReferrerStatuses)[number];
export type ReferralStatus = (typeof referralStatuses)[number];
export type ReferralPayoutStatus = (typeof referralPayoutStatuses)[number];
export type ReferralPayoutMilestone = (typeof referralPayoutMilestones)[number];

export const referralStatusLabels: Record<ReferralStatus, string> = {
  lead_created: "Lead created",
  demo_booked: "Demo booked",
  demo_attended: "Demo attended",
  subscription_started: "Subscription started",
  retained: "Retained",
  payout_eligible: "Payout eligible",
  paid: "Paid",
  rejected: "Rejected",
};

export const referrerStatusLabels: Record<ReferralReferrerStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  archived: "Archived",
};

export const payoutStatusLabels: Record<ReferralPayoutStatus, string> = {
  pending: "Pending",
  eligible: "Eligible",
  paid: "Paid",
  rejected: "Rejected",
};

export const referralApplicationSchema = z
  .object({
    fullName: nonEmptyTextSchema(160, 2),
    email: emailStringSchema,
    organizationName: optionalTextSchema(180),
    relationshipToOlea: nonEmptyTextSchema(500, 3),
    payoutContact: nonEmptyTextSchema(500, 3),
    termsAccepted: formBooleanValueSchema.refine((value) => value === "on", {
      message: "You must accept the referral program terms.",
    }),
  })
  .strict();

export const referralSettingsSchema = z
  .object({
    programEnabled: formBooleanValueSchema.transform(
      (value) => value === "on" || value === "true",
    ),
    demoAttendedPayout: decimalStringSchema(2),
    retainedCustomerPayout: decimalStringSchema(2),
    retentionDays: z.coerce.number().int().min(1).max(730),
    contactEmail: emailStringSchema,
    termsUrl: z.union([z.literal(""), httpUrlStringSchema]),
  })
  .strict();

export const referrerDecisionSchema = z
  .object({
    referrerId: z.string().uuid(),
    status: z.enum(["approved", "rejected", "suspended", "archived"]),
    statusReason: optionalTextSchema(500),
  })
  .strict();

export const referralMilestoneSchema = z
  .object({
    referralId: z.string().uuid(),
    status: z.enum(referralStatuses),
    notes: optionalTextSchema(700),
  })
  .strict();

export const payoutDecisionSchema = z
  .object({
    payoutId: z.string().uuid(),
    status: z.enum(referralPayoutStatuses),
    notes: optionalTextSchema(700),
    evidenceUrl: z.union([z.literal(""), httpUrlStringSchema]),
  })
  .strict();

export function centsFromDecimal(value: string) {
  return Math.round(Number.parseFloat(value) * 100);
}

export function decimalFromCents(value: number) {
  return (value / 100).toFixed(2);
}

export function formatReferralMoney(
  amountCents: number,
  currency = "CAD",
  locale = "en-CA",
) {
  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  }).format(amountCents / 100);
}

export function generateReferralCode() {
  return `OLEA-${randomBytes(8).toString("base64url").replace(/[-_]/g, "").slice(0, 10).toUpperCase()}`;
}

export function parseReferralCode(value: string | null | undefined) {
  const code = normalizeReferralCode(value);
  if (!code) throw new Error("Enter a valid referral code.");
  return code;
}
