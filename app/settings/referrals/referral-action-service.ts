import "server-only";

import type * as z from "zod";

import {
  generateReferralCode,
  referrerDecisionSchema,
} from "@/lib/referrals/domain";
import { createAdminClient } from "@/utils/supabase/admin";

type ActionResult = { ok: boolean; message: string };
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type ReferrerDecision = z.infer<typeof referrerDecisionSchema>;

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

async function createOrReuseReferralLink(
  supabase: SupabaseAdminClient,
  referrerId: string,
) {
  const { data: existingLink, error: linkLookupError } = await supabase
    .from("referral_links")
    .select("code")
    .eq("referrer_id", referrerId)
    .eq("active", true)
    .maybeSingle();

  if (linkLookupError) {
    return { ok: false, message: "Referral link could not be checked." } as const;
  }

  const approvedReferralCode = existingLink?.code ?? (await createUniqueReferralCode());
  if (existingLink) {
    return { ok: true, approvedReferralCode, createdReferralLinkId: null } as const;
  }

  const { data: insertedLink, error: insertLinkError } = await supabase
    .from("referral_links")
    .insert({ referrer_id: referrerId, code: approvedReferralCode })
    .select("id")
    .single();

  if (insertLinkError) {
    return { ok: false, message: "Referral link could not be created." } as const;
  }

  return {
    ok: true,
    approvedReferralCode,
    createdReferralLinkId: insertedLink.id,
  } as const;
}

async function deactivateReferralLinks(
  supabase: SupabaseAdminClient,
  referrerId: string,
  now: string,
) {
  const { error } = await supabase
    .from("referral_links")
    .update({ active: false, deactivated_at: now })
    .eq("referrer_id", referrerId)
    .eq("active", true);

  return error ? "Referral links could not be deactivated." : null;
}

async function prepareReferralLinkForStatus(
  supabase: SupabaseAdminClient,
  input: ReferrerDecision,
  now: string,
) {
  if (input.status === "approved") {
    return createOrReuseReferralLink(supabase, input.referrerId);
  }

  const errorMessage = await deactivateReferralLinks(supabase, input.referrerId, now);
  return errorMessage
    ? ({ ok: false, message: errorMessage } as const)
    : ({ ok: true, approvedReferralCode: null, createdReferralLinkId: null } as const);
}

function buildReferrerUpdateValues(input: ReferrerDecision, actorId: string, now: string) {
  return {
    status: input.status,
    status_reason: input.statusReason || null,
    approved_at: input.status === "approved" ? now : null,
    approved_by: input.status === "approved" ? actorId : null,
    rejected_at: input.status === "rejected" ? now : null,
    suspended_at: input.status === "suspended" ? now : null,
    archived_at: input.status === "archived" ? now : null,
  };
}

async function queueReferrerDecisionEmail({
  input,
  currentStatus,
  referrer,
  approvedReferralCode,
}: {
  input: ReferrerDecision;
  currentStatus: string;
  referrer: { email: string; full_name: string };
  approvedReferralCode: string | null;
}) {
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
  }

  if (input.status === "rejected" && currentStatus !== "rejected") {
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
}

async function insertReferralAuditEvent(
  supabase: SupabaseAdminClient,
  values: {
    actorUserId: string;
    eventType: string;
    message: string;
    referralId?: string;
    referrerId?: string;
  },
) {
  const { error } = await supabase.from("referral_audit_events").insert({
    referral_id: values.referralId,
    referrer_id: values.referrerId,
    actor_user_id: values.actorUserId,
    event_type: values.eventType,
    message: values.message,
  });

  return error ? "Referral audit log could not be saved." : null;
}

export async function applyReferrerDecision(
  input: ReferrerDecision,
  actorId: string,
): Promise<ActionResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: currentReferrer, error: currentReferrerError } = await supabase
    .from("referrers")
    .select("id, full_name, email, status")
    .eq("id", input.referrerId)
    .single();

  if (currentReferrerError) {
    return { ok: false, message: "Referrer could not be loaded." };
  }

  const linkResult = await prepareReferralLinkForStatus(supabase, input, now);
  if (!linkResult.ok) {
    return { ok: false, message: linkResult.message };
  }

  const { data: referrer, error } = await supabase
    .from("referrers")
    .update(buildReferrerUpdateValues(input, actorId, now))
    .eq("id", input.referrerId)
    .select("id, full_name, email, status")
    .single();

  if (error) {
    await deactivateCreatedLink(supabase, linkResult.createdReferralLinkId, now);
    return { ok: false, message: "Referrer status could not be updated." };
  }

  try {
    await queueReferrerDecisionEmail({
      input,
      currentStatus: currentReferrer.status,
      referrer,
      approvedReferralCode: linkResult.approvedReferralCode,
    });
  } catch {
    return {
      ok: false,
      message:
        "Referrer was updated, but the notification email could not be queued.",
    };
  }

  const auditError = await insertReferralAuditEvent(supabase, {
    referrerId: input.referrerId,
    actorUserId: actorId,
    eventType: `referrer_${input.status}`,
    message: input.statusReason || `Referrer marked ${input.status}.`,
  });

  return auditError
    ? { ok: false, message: auditError }
    : { ok: true, message: `Referrer marked ${input.status}.` };
}

async function deactivateCreatedLink(
  supabase: SupabaseAdminClient,
  createdReferralLinkId: string | null,
  now: string,
) {
  if (!createdReferralLinkId) {
    return;
  }

  await supabase
    .from("referral_links")
    .update({ active: false, deactivated_at: now })
    .eq("id", createdReferralLinkId);
}
