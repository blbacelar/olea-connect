import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getStripe } from "@/lib/stripe/server";

const COMMISSION_CAP_CENTS = 50_000;

export function firstPaymentCommissionCents(amountPaidCents: number) {
  if (!Number.isSafeInteger(amountPaidCents) || amountPaidCents <= 0) {
    throw new Error("A positive paid invoice amount is required.");
  }
  return Math.min(COMMISSION_CAP_CENTS, Math.round(amountPaidCents * 0.1));
}

export function firstMembershipPaymentInvoice(invoices: Stripe.Invoice[]) {
  return invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" &&
        invoice.currency.toUpperCase() === "CAD" &&
        invoice.amount_paid > 0 &&
        ["subscription_create", "subscription_cycle"].includes(
          invoice.billing_reason ?? "",
        ),
    )
    .sort((left, right) => left.created - right.created || left.id.localeCompare(right.id))[0];
}

export async function recordFirstPaymentReferralCommission(
  supabase: SupabaseClient,
  subscriptionId: string,
) {
  const { data: request, error: requestError } = await supabase
    .from("workspace_provisioning_requests")
    .select("id")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return;

  const { data: referral, error: referralError } = await supabase
    .from("referrals")
    .select("id, status, referred_organization_id")
    .eq("referred_provisioning_request_id", request.id)
    .maybeSingle();
  if (referralError) throw referralError;
  if (!referral || referral.status === "rejected" || !referral.referred_organization_id) return;

  const { data: legacyPaidPayout, error: legacyPaidError } = await supabase
    .from("referral_payouts")
    .select("id")
    .eq("referral_id", referral.id)
    .in("milestone", ["demo_attended", "retained"])
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  if (legacyPaidError) throw legacyPaidError;
  if (legacyPaidPayout) return;

  const { data: existing, error: existingError } = await supabase
    .from("referral_payouts")
    .select("id")
    .eq("referral_id", referral.id)
    .eq("milestone", "first_payment")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;

  const { data: organizationPayout, error: organizationPayoutError } = await supabase
    .from("referral_payouts")
    .select("id")
    .eq("referred_organization_id", referral.referred_organization_id)
    .eq("milestone", "first_payment")
    .maybeSingle();
  if (organizationPayoutError) throw organizationPayoutError;
  if (organizationPayout) return;

  const invoices = await getStripe()
    .invoices.list({ subscription: subscriptionId, status: "paid", limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  const firstInvoice = firstMembershipPaymentInvoice(invoices);
  if (!firstInvoice) return;

  const { error: payoutError } = await supabase.from("referral_payouts").upsert(
    {
      referral_id: referral.id,
      referred_organization_id: referral.referred_organization_id,
      milestone: "first_payment",
      source_invoice_id: firstInvoice.id,
      purchase_amount_cents: firstInvoice.amount_paid,
      amount_cents: firstPaymentCommissionCents(firstInvoice.amount_paid),
      currency: "CAD",
      status: "pending",
      notes: "First paid membership invoice verified. Review refunds before payout.",
    },
    { onConflict: "referral_id,milestone", ignoreDuplicates: true },
  );
  if (payoutError?.code === "23505") {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("referral_payouts")
      .select("id")
      .eq("referred_organization_id", referral.referred_organization_id)
      .eq("milestone", "first_payment")
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) return;
  }
  if (payoutError) throw payoutError;
}
