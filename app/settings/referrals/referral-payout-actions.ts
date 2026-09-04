import "server-only";

import type * as z from "zod";

import {
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

async function loadReferralSettings(supabase: SupabaseAdminClient) {
  const { data, error } = await supabase
    .from("referral_program_settings")
    .select("demo_attended_payout_cents, retained_customer_payout_cents, currency")
    .eq("id", true)
    .single();

  if (error) {
    return { ok: false, message: "Referral settings could not be loaded." } as const;
  }

  return { ok: true, settings: data } as const;
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

function payoutAmountForMilestone(
  settings: {
    demo_attended_payout_cents: number;
    retained_customer_payout_cents: number;
  },
  status: ReferralMilestone["status"],
) {
  return status === "demo_attended"
    ? settings.demo_attended_payout_cents
    : settings.retained_customer_payout_cents;
}

function milestoneCreatesPayout(status: ReferralMilestone["status"]) {
  return status === "demo_attended" || status === "retained";
}

async function upsertEligiblePayout({
  supabase,
  input,
  settings,
  actorId,
}: {
  supabase: SupabaseAdminClient;
  input: ReferralMilestone;
  settings: {
    demo_attended_payout_cents: number;
    retained_customer_payout_cents: number;
    currency: string;
  };
  actorId: string;
}) {
  if (!milestoneCreatesPayout(input.status)) {
    return null;
  }

  const { data: existingPayout, error: payoutLookupError } = await supabase
    .from("referral_payouts")
    .select("id, status")
    .eq("referral_id", input.referralId)
    .eq("milestone", input.status)
    .maybeSingle();

  if (payoutLookupError) {
    return "Referral payout could not be checked.";
  }

  return existingPayout
    ? updateEligiblePayout({ supabase, existingPayout, input, settings })
    : insertEligiblePayout({ supabase, input, settings, actorId });
}

async function insertEligiblePayout({
  supabase,
  input,
  settings,
  actorId,
}: {
  supabase: SupabaseAdminClient;
  input: ReferralMilestone;
  settings: {
    demo_attended_payout_cents: number;
    retained_customer_payout_cents: number;
    currency: string;
  };
  actorId: string;
}) {
  const { error } = await supabase.from("referral_payouts").insert({
    referral_id: input.referralId,
    milestone: input.status,
    amount_cents: payoutAmountForMilestone(settings, input.status),
    currency: settings.currency,
    status: "eligible",
    due_at: new Date().toISOString(),
    notes: input.notes || null,
    created_by: actorId,
  });

  return error ? "Referral payout could not be created." : null;
}

async function updateEligiblePayout({
  supabase,
  existingPayout,
  input,
  settings,
}: {
  supabase: SupabaseAdminClient;
  existingPayout: { id: string; status: string };
  input: ReferralMilestone;
  settings: {
    demo_attended_payout_cents: number;
    retained_customer_payout_cents: number;
    currency: string;
  };
}) {
  if (existingPayout.status === "paid" || existingPayout.status === "rejected") {
    return null;
  }

  const { error } = await supabase
    .from("referral_payouts")
    .update({
      amount_cents: payoutAmountForMilestone(settings, input.status),
      currency: settings.currency,
      status: "eligible",
      notes: input.notes || null,
    })
    .eq("id", existingPayout.id);

  return error ? "Referral payout could not be updated." : null;
}

export async function saveReferralMilestone(
  input: ReferralMilestone,
  actorId: string,
): Promise<ActionResult> {
  const supabase = createAdminClient();
  const settingsResult = await loadReferralSettings(supabase);
  if (!settingsResult.ok) return settingsResult;

  const statusError = await updateReferralStatus(supabase, input);
  if (statusError) return { ok: false, message: statusError };

  const milestoneError = await upsertReferralMilestone(supabase, input, actorId);
  if (milestoneError) return { ok: false, message: milestoneError };

  const payoutError = await upsertEligiblePayout({
    supabase,
    input,
    settings: settingsResult.settings,
    actorId,
  });
  if (payoutError) return { ok: false, message: payoutError };

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

  if (input.status === "paid" && !input.evidenceUrl && !input.notes) {
    return "Add a payment note or evidence URL before marking a payout paid.";
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
    .select("id, referral_id, milestone, status")
    .eq("id", input.payoutId)
    .single();

  if (payoutLookupError) return { ok: false, message: "Payout could not be loaded." };

  const currentPayoutStatus = existingPayout.status as ReferralPayoutStatus;
  const validationError = validatePayoutDecision(input, currentPayoutStatus);
  if (validationError) return { ok: false, message: validationError };

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
