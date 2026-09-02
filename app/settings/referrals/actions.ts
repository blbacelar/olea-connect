"use server";

import { revalidatePath } from "next/cache";

import { requireReferralAdmin } from "@/lib/data/referrals";
import {
  centsFromDecimal,
  generateReferralCode,
  payoutDecisionSchema,
  referralMilestoneSchema,
  referralSettingsSchema,
  referrerDecisionSchema,
  type ReferralPayoutStatus,
} from "@/lib/referrals/domain";
import { createAdminClient } from "@/utils/supabase/admin";

type ActionResult = { ok: boolean; message: string };

const allowedPayoutTransitions: Record<
  ReferralPayoutStatus,
  readonly ReferralPayoutStatus[]
> = {
  pending: ["pending", "eligible", "rejected"],
  eligible: ["eligible", "paid", "rejected"],
  paid: ["paid"],
  rejected: ["rejected"],
} as const;

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function enqueueReferralEmail(input: {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("integration_events").upsert(
    {
      event_type: input.eventType,
      aggregate_type: "referral_program",
      aggregate_id: input.aggregateId,
      provider: "email",
      payload: input.payload,
      idempotency_key: input.idempotencyKey,
    },
    { onConflict: "idempotency_key" },
  );

  if (error) throw error;
}

async function createUniqueReferralCode() {
  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    const { data, error } = await supabase
      .from("referral_links")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new Error("Unable to generate a unique referral code.");
}

function stableReasonKey(value: string | undefined) {
  return Buffer.from(value?.trim() || "none")
    .toString("base64url")
    .slice(0, 32);
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

  const supabase = createAdminClient();
  const input = parsed.data;
  const now = new Date().toISOString();
  const { data: currentReferrer, error: currentReferrerError } = await supabase
    .from("referrers")
    .select("id, full_name, email, status")
    .eq("id", input.referrerId)
    .single();
  if (currentReferrerError) {
    return { ok: false, message: "Referrer could not be loaded." };
  }

  let approvedReferralCode: string | null = null;
  let createdReferralLinkId: string | null = null;
  if (input.status === "approved") {
    const { data: existingLink, error: linkLookupError } = await supabase
      .from("referral_links")
      .select("code")
      .eq("referrer_id", input.referrerId)
      .eq("active", true)
      .maybeSingle();
    if (linkLookupError) return { ok: false, message: "Referral link could not be checked." };

    approvedReferralCode = existingLink?.code ?? (await createUniqueReferralCode());
    if (!existingLink) {
      const { data: insertedLink, error: insertLinkError } = await supabase
        .from("referral_links")
        .insert({
          referrer_id: input.referrerId,
          code: approvedReferralCode,
        })
        .select("id")
        .single();
      if (insertLinkError) {
        return { ok: false, message: "Referral link could not be created." };
      }
      createdReferralLinkId = insertedLink.id;
    }
  } else {
    const { error: deactivateLinkError } = await supabase
      .from("referral_links")
      .update({
        active: false,
        deactivated_at: now,
      })
      .eq("referrer_id", input.referrerId)
      .eq("active", true);
    if (deactivateLinkError) {
      return { ok: false, message: "Referral links could not be deactivated." };
    }
  }

  const updateValues = {
    status: input.status,
    status_reason: input.statusReason || null,
    approved_at: input.status === "approved" ? now : null,
    approved_by: input.status === "approved" ? session.member.id : null,
    rejected_at: input.status === "rejected" ? now : null,
    suspended_at: input.status === "suspended" ? now : null,
    archived_at: input.status === "archived" ? now : null,
  };

  const { data: referrer, error } = await supabase
    .from("referrers")
    .update(updateValues)
    .eq("id", input.referrerId)
    .select("id, full_name, email, status")
    .single();

  if (error) {
    if (createdReferralLinkId) {
      await supabase
        .from("referral_links")
        .update({ active: false, deactivated_at: now })
        .eq("id", createdReferralLinkId);
    }
    return { ok: false, message: "Referrer status could not be updated." };
  }

  try {
    if (input.status === "approved" && approvedReferralCode) {
      await enqueueReferralEmail({
        eventType: "referral.application.approved",
        aggregateId: input.referrerId,
        idempotencyKey: `referral.application.approved:${input.referrerId}:${approvedReferralCode}`,
        payload: {
          recipient_email: referrer.email,
          full_name: referrer.full_name,
          referral_code: approvedReferralCode,
          referral_path: `/ref/${approvedReferralCode}`,
        },
      });
    } else if (
      input.status === "rejected" &&
      currentReferrer.status !== "rejected"
    ) {
      await enqueueReferralEmail({
        eventType: "referral.application.rejected",
        aggregateId: input.referrerId,
        idempotencyKey: `referral.application.rejected:${input.referrerId}:${stableReasonKey(input.statusReason)}`,
        payload: {
          recipient_email: referrer.email,
          full_name: referrer.full_name,
          reason: input.statusReason,
        },
      });
    }
  } catch {
    return {
      ok: false,
      message:
        "Referrer was updated, but the notification email could not be queued.",
    };
  }

  const { error: auditError } = await supabase.from("referral_audit_events").insert({
    referrer_id: input.referrerId,
    actor_user_id: session.member.id,
    event_type: `referrer_${input.status}`,
    message: input.statusReason || `Referrer marked ${input.status}.`,
  });
  if (auditError) return { ok: false, message: "Referral audit log could not be saved." };

  revalidatePath("/settings/referrals");
  revalidatePath("/referrals/dashboard");
  return { ok: true, message: `Referrer marked ${input.status}.` };
}

export async function updateReferralMilestone(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireReferralAdmin();
  const parsed = referralMilestoneSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid referral milestone." };
  }

  const supabase = createAdminClient();
  const input = parsed.data;
  const { data: settings, error: settingsError } = await supabase
    .from("referral_program_settings")
    .select("demo_attended_payout_cents, retained_customer_payout_cents, currency")
    .eq("id", true)
    .single();
  if (settingsError) return { ok: false, message: "Referral settings could not be loaded." };

  const { error } = await supabase
    .from("referrals")
    .update({
      status: input.status,
      last_milestone_at: new Date().toISOString(),
    })
    .eq("id", input.referralId);
  if (error) return { ok: false, message: "Referral status could not be updated." };

  const { error: milestoneError } = await supabase.from("referral_milestones").upsert(
    {
      referral_id: input.referralId,
      milestone: input.status,
      notes: input.notes || null,
      created_by: session.member.id,
    },
    { onConflict: "referral_id,milestone" },
  );
  if (milestoneError) return { ok: false, message: "Referral milestone could not be saved." };

  if (input.status === "demo_attended" || input.status === "retained") {
    const amount =
      input.status === "demo_attended"
        ? settings.demo_attended_payout_cents
        : settings.retained_customer_payout_cents;
    const { data: existingPayout, error: payoutLookupError } = await supabase
      .from("referral_payouts")
      .select("id, status")
      .eq("referral_id", input.referralId)
      .eq("milestone", input.status)
      .maybeSingle();
    if (payoutLookupError) {
      return { ok: false, message: "Referral payout could not be checked." };
    }

    if (!existingPayout) {
      const { error: payoutInsertError } = await supabase.from("referral_payouts").insert({
        referral_id: input.referralId,
        milestone: input.status,
        amount_cents: amount,
        currency: settings.currency,
        status: "eligible",
        due_at: new Date().toISOString(),
        notes: input.notes || null,
        created_by: session.member.id,
      });
      if (payoutInsertError) {
        return { ok: false, message: "Referral payout could not be created." };
      }
    } else if (existingPayout.status !== "paid" && existingPayout.status !== "rejected") {
      const { error: payoutUpdateError } = await supabase
        .from("referral_payouts")
        .update({
          amount_cents: amount,
          currency: settings.currency,
          status: "eligible",
          notes: input.notes || null,
        })
        .eq("id", existingPayout.id);
      if (payoutUpdateError) {
        return { ok: false, message: "Referral payout could not be updated." };
      }
    }
  }

  const { error: auditError } = await supabase.from("referral_audit_events").insert({
    referral_id: input.referralId,
    actor_user_id: session.member.id,
    event_type: `referral_${input.status}`,
    message: input.notes || `Referral moved to ${input.status}.`,
  });
  if (auditError) return { ok: false, message: "Referral audit log could not be saved." };

  revalidatePath("/settings/referrals");
  revalidatePath("/referrals/dashboard");
  return { ok: true, message: "Referral milestone saved." };
}

export async function updateReferralPayout(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireReferralAdmin();
  const parsed = payoutDecisionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid payout action." };
  }

  const supabase = createAdminClient();
  const input = parsed.data;
  const { data: existingPayout, error: payoutLookupError } = await supabase
    .from("referral_payouts")
    .select("id, referral_id, milestone, status")
    .eq("id", input.payoutId)
    .single();
  if (payoutLookupError) return { ok: false, message: "Payout could not be loaded." };

  const currentPayoutStatus = existingPayout.status as ReferralPayoutStatus;
  if (!allowedPayoutTransitions[currentPayoutStatus].includes(input.status)) {
    return {
      ok: false,
      message: `Payout cannot move from ${currentPayoutStatus} to ${input.status}.`,
    };
  }

  if (input.status === "paid" && !input.evidenceUrl && !input.notes) {
    return {
      ok: false,
      message: "Add a payment note or evidence URL before marking a payout paid.",
    };
  }

  const { data: payout, error } = await supabase
    .from("referral_payouts")
    .update({
      status: input.status,
      paid_at: input.status === "paid" ? new Date().toISOString() : null,
      notes: input.notes || null,
      evidence_url: input.evidenceUrl || null,
    })
    .eq("id", input.payoutId)
    .select("id, referral_id, milestone")
    .single();

  if (error) return { ok: false, message: "Payout could not be updated." };

  const { error: auditError } = await supabase.from("referral_audit_events").insert({
    referral_id: payout.referral_id,
    actor_user_id: session.member.id,
    event_type: `payout_${input.status}`,
    message: input.notes || `${payout.milestone} payout marked ${input.status}.`,
  });
  if (auditError) return { ok: false, message: "Referral audit log could not be saved." };

  revalidatePath("/settings/referrals");
  revalidatePath("/referrals/dashboard");
  return { ok: true, message: "Payout updated." };
}
