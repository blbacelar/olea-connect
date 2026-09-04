"use server";

import { revalidatePath } from "next/cache";

import { requireReferralAdmin } from "@/lib/data/referrals";
import {
  centsFromDecimal,
  payoutDecisionSchema,
  referralMilestoneSchema,
  referralSettingsSchema,
  referrerDecisionSchema,
} from "@/lib/referrals/domain";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  applyReferrerDecision,
} from "./referral-action-service";
import {
  saveReferralMilestone,
  saveReferralPayoutDecision,
} from "./referral-payout-actions";

type ActionResult = { ok: boolean; message: string };

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function updateReferralProgramSettings(
  formData: FormData,
): Promise<ActionResult> {
  await requireReferralAdmin();
  const parsed = referralSettingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  const supabase = createAdminClient();
  const input = parsed.data;
  const { error } = await supabase
    .from("referral_program_settings")
    .update({
      program_enabled: input.programEnabled,
      demo_attended_payout_cents: centsFromDecimal(input.demoAttendedPayout),
      retained_customer_payout_cents: centsFromDecimal(input.retainedCustomerPayout),
      retention_days: input.retentionDays,
      contact_email: input.contactEmail,
      terms_url: input.termsUrl || null,
    })
    .eq("id", true);

  if (error) return { ok: false, message: "Referral settings could not be saved." };
  revalidatePath("/settings/referrals");
  return { ok: true, message: "Referral settings saved." };
}

export async function updateReferrerStatus(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireReferralAdmin();
  const parsed = referrerDecisionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid referrer action." };
  }

  const input = parsed.data;
  const result = await applyReferrerDecision(input, session.member.id);
  if (!result.ok) return result;

  revalidatePath("/settings/referrals");
  revalidatePath("/referrals/dashboard");
  return result;
}

export async function updateReferralMilestone(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireReferralAdmin();
  const parsed = referralMilestoneSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid referral milestone." };
  }

  const input = parsed.data;
  const result = await saveReferralMilestone(input, session.member.id);
  if (!result.ok) return result;

  revalidatePath("/settings/referrals");
  revalidatePath("/referrals/dashboard");
  return result;
}

export async function updateReferralPayout(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireReferralAdmin();
  const parsed = payoutDecisionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid payout action." };
  }

  const input = parsed.data;
  const result = await saveReferralPayoutDecision(input, session.member.id);
  if (!result.ok) return result;

  revalidatePath("/settings/referrals");
  revalidatePath("/referrals/dashboard");
  return result;
}
