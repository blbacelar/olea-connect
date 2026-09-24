import "server-only";

import type * as z from "zod";

import { hasVerifiedUnrefundedPayment } from "@/lib/referrals/payment-verification";
import { getStripe } from "@/lib/stripe/server";
import {
  manualReferralStatuses,
  payoutDecisionSchema,
  referralMilestoneSchema,
  type ReferralPayoutStatus,
} from "@/lib/referrals/domain";
import { createAdminClient } from "@/utils/supabase/admin";

type ActionResult = { ok: boolean; message: string };
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type ReferralMilestone = z.infer<typeof referralMilestoneSchema>;
type PayoutDecision = z.infer<typeof payoutDecisionSchema>;

const allowedPayoutTransitions: Record<
  ReferralPayoutStatus,
  readonly ReferralPayoutStatus[]
> = {
  pending: ["pending", "eligible", "rejected"],
  eligible: ["eligible", "paid", "rejected"],
  paid: ["paid"],
  rejected: ["rejected"],
} as const;

async function insertReferralAuditEvent(
  supabase: SupabaseAdminClient,
  values: {
    actorUserId: string;
    eventType: string;
    message: string;
    referralId?: string;
  },
) {
  const { error } = await supabase.from("referral_audit_events").insert({
    referral_id: values.referralId,
    actor_user_id: values.actorUserId,
    event_type: values.eventType,
    message: values.message,
  });

  return error ? "Referral audit log could not be saved." : null;
}

async function updateReferralStatus(
  supabase: SupabaseAdminClient,
  input: ReferralMilestone,
) {
  const { error } = await supabase
    .from("referrals")
    .update({
      status: input.status,
      last_milestone_at: new Date().toISOString(),
    })
    .eq("id", input.referralId);

  return error ? "Referral status could not be updated." : null;
}

async function upsertReferralMilestone(
  supabase: SupabaseAdminClient,
  input: ReferralMilestone,
  actorId: string,
) {
  const { error } = await supabase.from("referral_milestones").upsert(
    {
      referral_id: input.referralId,
      milestone: input.status,
      notes: input.notes || null,
      created_by: actorId,
    },
    { onConflict: "referral_id,milestone" },
  );

  return error ? "Referral milestone could not be saved." : null;
}

export async function saveReferralMilestone(
  input: ReferralMilestone,
  actorId: string,
): Promise<ActionResult> {
  if (!manualReferralStatuses.some((status) => status === input.status)) {
    return {
      ok: false,
      message: "Purchase and payout statuses require verified billing evidence.",
    };
  }

  const supabase = createAdminClient();

  const statusError = await updateReferralStatus(supabase, input);
  if (statusError) return { ok: false, message: statusError };

  const milestoneError = await upsertReferralMilestone(supabase, input, actorId);
  if (milestoneError) return { ok: false, message: milestoneError };

  const auditError = await insertReferralAuditEvent(supabase, {
    referralId: input.referralId,
    actorUserId: actorId,
    eventType: `referral_${input.status}`,
    message: input.notes || `Referral moved to ${input.status}.`,
  });

  return auditError
    ? { ok: false, message: auditError }
    : { ok: true, message: "Referral milestone saved." };
}

function validatePayoutDecision(
  input: PayoutDecision,
  currentPayoutStatus: ReferralPayoutStatus,
) {
  if (!allowedPayoutTransitions[currentPayoutStatus].includes(input.status)) {
    return `Payout cannot move from ${currentPayoutStatus} to ${input.status}.`;
  }

  if (input.status === "paid" && !input.evidenceUrl) {
    return "Add a payout receipt URL before marking a commission paid.";
  }

  return null;
}

export async function saveReferralPayoutDecision(
  input: PayoutDecision,
  actorId: string,
): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { data: existingPayout, error: payoutLookupError } = await supabase
    .from("referral_payouts")
    .select("id, referral_id, milestone, status, paid_at, source_invoice_id, purchase_amount_cents")
    .eq("id", input.payoutId)
    .single();

  if (payoutLookupError) return { ok: false, message: "Payout could not be loaded." };

  if (existingPayout.milestone !== "first_payment" && input.status !== existingPayout.status) {
    return { ok: false, message: "Legacy rewards cannot be approved under the current referral policy." };
  }

  if (["eligible", "paid"].includes(input.status) && existingPayout.milestone === "first_payment") {
    if (!existingPayout.source_invoice_id || !existingPayout.purchase_amount_cents) {
      return { ok: false, message: "Stripe invoice evidence is missing." };
    }
    let invoice;
    let paymentIsUnrefunded;
    try {
      const stripe = getStripe();
      invoice = await stripe.invoices.retrieve(existingPayout.source_invoice_id);
      paymentIsUnrefunded = await hasVerifiedUnrefundedPayment(
        stripe,
        existingPayout.source_invoice_id,
      );
    } catch {
      return { ok: false, message: "Stripe payment could not be checked. Try again before approving." };
    }
    if (
      invoice.status !== "paid" ||
      invoice.currency.toUpperCase() !== "CAD" ||
      invoice.amount_paid !== existingPayout.purchase_amount_cents ||
      !paymentIsUnrefunded
    ) {
      return { ok: false, message: "Payment, refund, or dispute status could not be verified. Keep this commission pending." };
    }
  }

  const currentPayoutStatus = existingPayout.status as ReferralPayoutStatus;
  const validationError = validatePayoutDecision(input, currentPayoutStatus);
  if (validationError) return { ok: false, message: validationError };

  if (["eligible", "paid"].includes(input.status)) {
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("status")
      .eq("id", existingPayout.referral_id)
      .single();
    if (referralError || referral.status === "rejected") {
      return { ok: false, message: "Rejected or unavailable referrals cannot receive a payout." };
    }
  }

  const { data: payout, error } = await supabase
    .from("referral_payouts")
    .update({
      status: input.status,
      paid_at: input.status === "paid"
        ? existingPayout.paid_at ?? new Date().toISOString()
        : null,
      notes: input.notes || null,
      evidence_url: input.evidenceUrl || null,
    })
    .eq("id", input.payoutId)
    .eq("status", currentPayoutStatus)
    .select("id, referral_id, milestone")
    .maybeSingle();

  if (error) return { ok: false, message: "Payout could not be updated." };
  if (!payout) {
    return { ok: false, message: "Payout changed since you opened it. Refresh and review the latest status." };
  }

  const auditError = await insertReferralAuditEvent(supabase, {
    referralId: payout.referral_id,
    actorUserId: actorId,
    eventType: `payout_${input.status}`,
    message: input.notes || `${payout.milestone} payout marked ${input.status}.`,
  });

  return auditError
    ? { ok: false, message: auditError }
    : { ok: true, message: "Payout updated." };
}
