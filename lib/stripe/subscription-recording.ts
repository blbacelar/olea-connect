import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";
import type { MembershipTier } from "@/lib/types";

const tiers: MembershipTier[] = ["seedling", "roots", "canopy", "harvest"];

function getSubscriptionCustomerId(subscription: Stripe.Subscription) {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

function getSubscriptionPlanId(subscription: Stripe.Subscription) {
  const planId = subscription.metadata.plan_id as MembershipTier;
  return tiers.includes(planId) ? planId : undefined;
}

function getSubscriptionBillingInterval(
  firstItem: Stripe.SubscriptionItem | undefined,
) {
  return firstItem?.price.recurring?.interval === "year" ? "year" : "month";
}

function getPaymentConfirmedAt(status: string) {
  return status === "active" || status === "trialing"
    ? new Date().toISOString()
    : null;
}

function buildSubscriptionUpdateValues(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const status = mapSubscriptionStatus(subscription);
  const planId = getSubscriptionPlanId(subscription);

  return {
    ...(planId ? { plan_id: planId } : {}),
    billing_interval: getSubscriptionBillingInterval(firstItem),
    provider_customer_id: getSubscriptionCustomerId(subscription),
    provider_subscription_id: subscription.id,
    provider_status: status,
    quantity: firstItem?.quantity ?? 1,
    current_period_start: toIsoDate(firstItem?.current_period_start),
    current_period_end: toIsoDate(firstItem?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toIsoDate(subscription.canceled_at),
    stripe_snapshot: subscription,
    payment_confirmed_at: getPaymentConfirmedAt(status),
  };
}

export async function recordStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const requestId = subscription.metadata.provisioning_request_id;
  if (!requestId) return null;

  const { data, error } = await supabase
    .from("workspace_provisioning_requests")
    .update(buildSubscriptionUpdateValues(subscription))
    .eq("id", requestId)
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}
