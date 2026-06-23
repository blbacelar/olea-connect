import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPlanId,
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";
import type { MembershipTier, RegistrationState } from "@/lib/types";

const membershipTiers: MembershipTier[] = [
  "seedling",
  "roots",
  "canopy",
  "harvest",
];
const billingCycles: RegistrationState["billingCycle"][] = [
  "monthly",
  "annual",
];

function isMembershipTier(value: unknown): value is MembershipTier {
  return typeof value === "string" && membershipTiers.includes(value as MembershipTier);
}

function getConfiguredPlanIdFromPriceId(priceId: string | undefined) {
  if (!priceId) return null;

  for (const tier of membershipTiers) {
    for (const cycle of billingCycles) {
      const key = `STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
      if (process.env[key] === priceId) return tier;
    }
  }

  return null;
}

function getSubscriptionMetadataPlanId(subscription: Stripe.Subscription) {
  return isMembershipTier(subscription.metadata.plan_id)
    ? subscription.metadata.plan_id
    : null;
}

function getItemPlanId(item: Stripe.SubscriptionItem | undefined) {
  return getPlanId(item) ?? getConfiguredPlanIdFromPriceId(item?.price.id);
}

function getSubscriptionItemType(item: Stripe.SubscriptionItem) {
  return item.price.metadata.item_type || (getItemPlanId(item) ? "membership" : "seat");
}

function getMembershipItem(subscription: Stripe.Subscription) {
  return (
    subscription.items.data.find((item) => getSubscriptionItemType(item) === "membership") ??
    subscription.items.data.find((item) => getPlanId(item)) ??
    subscription.items.data[0]
  );
}

function getPersistableQuantity(item: Stripe.SubscriptionItem) {
  return Math.max(item.quantity ?? 1, 1);
}

export async function syncStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const localSubscriptionId = subscription.metadata.local_subscription_id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const membershipItem = getMembershipItem(subscription);
  const planId =
    getItemPlanId(membershipItem) ?? getSubscriptionMetadataPlanId(subscription);
  const billingInterval = membershipItem?.price.recurring?.interval;

  let lookup = supabase
    .from("subscriptions")
    .select("id, metadata, pause_starts_at");
  lookup = localSubscriptionId
    ? lookup.eq("id", localSubscriptionId)
    : lookup.eq("provider_subscription_id", subscription.id);

  const { data: existingSubscription, error: lookupError } = await lookup
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existingSubscription) {
    throw new Error(`No local subscription matches ${subscription.id}.`);
  }

  const { data: localSubscription, error } = await supabase
    .from("subscriptions")
    .update({
      ...(planId ? { plan_id: planId } : {}),
      provider_customer_id: customerId,
      provider_subscription_id: subscription.id,
      ...(billingInterval === "month" || billingInterval === "year"
        ? { billing_interval: billingInterval }
        : {}),
      status: mapSubscriptionStatus(subscription),
      quantity: membershipItem ? getPersistableQuantity(membershipItem) : 1,
      current_period_start: toIsoDate(membershipItem?.current_period_start),
      current_period_end: toIsoDate(membershipItem?.current_period_end),
      pause_starts_at: subscription.pause_collection
        ? existingSubscription.pause_starts_at ?? new Date().toISOString()
        : null,
      pause_ends_at: toIsoDate(subscription.pause_collection?.resumes_at),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: toIsoDate(subscription.canceled_at),
      metadata: {
        ...(existingSubscription.metadata ?? {}),
        stripe_latest_invoice:
          typeof subscription.latest_invoice === "string"
            ? subscription.latest_invoice
            : subscription.latest_invoice?.id,
        stripe_price_id: membershipItem?.price.id,
      },
    })
    .eq("id", existingSubscription.id)
    .select("id")
    .single();

  if (error) throw error;

  const stripeItemIds = subscription.items.data.map((item) => item.id);
  let staleItems = supabase
    .from("subscription_items")
    .update({ active: false })
    .eq("subscription_id", localSubscription.id);
  if (stripeItemIds.length > 0) {
    staleItems = staleItems.not("provider_item_id", "in", `(${stripeItemIds.join(",")})`);
  }
  const { error: staleItemError } = await staleItems;
  if (staleItemError) throw staleItemError;

  for (const item of subscription.items.data) {
    const { data: existingItem, error: itemLookupError } = await supabase
      .from("subscription_items")
      .select("id")
      .eq("provider_item_id", item.id)
      .maybeSingle();

    if (itemLookupError) throw itemLookupError;

    const values = {
      subscription_id: localSubscription.id,
      item_type: getSubscriptionItemType(item),
      provider_item_id: item.id,
      quantity: getPersistableQuantity(item),
      unit_amount_cents: item.price.unit_amount ?? 0,
      currency: item.price.currency.toUpperCase(),
      active: !item.deleted && (item.quantity ?? 1) > 0,
    };

    const itemMutation = existingItem
      ? supabase
          .from("subscription_items")
          .update(values)
          .eq("id", existingItem.id)
      : supabase.from("subscription_items").insert(values);
    const { error: itemError } = await itemMutation;

    if (itemError) throw itemError;
  }

  return localSubscription.id as string;
}
