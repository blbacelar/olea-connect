import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPlanId,
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";
import type { MembershipTier, RegistrationState } from "@/lib/types";

export { syncPaidSeatCheckout } from "@/lib/stripe/paid-seat-checkout";

const membershipTiers: MembershipTier[] = [
  "seedling",
  "roots",
  "canopy",
  "harvest",
];
const billingCycles: RegistrationState["billingCycle"][] = [
  "quarterly",
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

function getCustomerId(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id;
}

function getValidBillingInterval(interval: string | null | undefined) {
  return interval === "month" || interval === "year" ? interval : null;
}

function getSubscriptionPauseStartsAt(
  subscription: Stripe.Subscription,
  existingPauseStartsAt: string | null,
) {
  if (!subscription.pause_collection) return null;
  return existingPauseStartsAt ?? new Date().toISOString();
}

function getLatestInvoiceId(subscription: Stripe.Subscription) {
  return typeof subscription.latest_invoice === "string"
    ? subscription.latest_invoice
    : subscription.latest_invoice?.id;
}

async function findLocalSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const localSubscriptionId = subscription.metadata.local_subscription_id;
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

  return existingSubscription;
}

function buildLocalSubscriptionUpdate(
  subscription: Stripe.Subscription,
  existingSubscription: {
    metadata: Record<string, unknown> | null;
    pause_starts_at: string | null;
  },
) {
  const membershipItem = getMembershipItem(subscription);
  const planId =
    getItemPlanId(membershipItem) ?? getSubscriptionMetadataPlanId(subscription);
  const billingInterval = getValidBillingInterval(
    membershipItem?.price.recurring?.interval,
  );

  return {
    ...(planId ? { plan_id: planId } : {}),
    provider_customer_id: getCustomerId(subscription.customer),
    provider_subscription_id: subscription.id,
    ...(billingInterval ? { billing_interval: billingInterval } : {}),
    status: mapSubscriptionStatus(subscription),
    quantity: membershipItem ? getPersistableQuantity(membershipItem) : 1,
    current_period_start: toIsoDate(membershipItem?.current_period_start),
    current_period_end: toIsoDate(membershipItem?.current_period_end),
    pause_starts_at: getSubscriptionPauseStartsAt(
      subscription,
      existingSubscription.pause_starts_at,
    ),
    pause_ends_at: toIsoDate(subscription.pause_collection?.resumes_at),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toIsoDate(subscription.canceled_at),
    metadata: {
      ...(existingSubscription.metadata ?? {}),
      stripe_latest_invoice: getLatestInvoiceId(subscription),
      stripe_price_id: membershipItem?.price.id,
    },
  };
}

async function updateLocalSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  existingSubscription: {
    id: string;
    metadata: Record<string, unknown> | null;
    pause_starts_at: string | null;
  },
) {
  const { data: localSubscription, error } = await supabase
    .from("subscriptions")
    .update(buildLocalSubscriptionUpdate(subscription, existingSubscription))
    .eq("id", existingSubscription.id)
    .select("id")
    .single();

  if (error) throw error;
  return localSubscription;
}

async function deactivateStaleStripeItems(
  supabase: SupabaseClient,
  localSubscriptionId: string,
  stripeItemIds: string[],
) {
  let staleItems = supabase
    .from("subscription_items")
    .update({ active: false })
    .eq("subscription_id", localSubscriptionId)
    .not("provider_item_id", "like", "seat_purchase:%");
  if (stripeItemIds.length > 0) {
    staleItems = staleItems.not("provider_item_id", "in", `(${stripeItemIds.join(",")})`);
  }
  const { error } = await staleItems;
  if (error) throw error;
}

async function upsertStripeSubscriptionItem(
  supabase: SupabaseClient,
  localSubscriptionId: string,
  item: Stripe.SubscriptionItem,
) {
  const { data: existingItem, error: itemLookupError } = await supabase
    .from("subscription_items")
    .select("id")
    .eq("provider_item_id", item.id)
    .maybeSingle();

  if (itemLookupError) throw itemLookupError;

  const values = {
    subscription_id: localSubscriptionId,
    item_type: getSubscriptionItemType(item),
    provider_item_id: item.id,
    quantity: getPersistableQuantity(item),
    unit_amount_cents: item.price.unit_amount ?? 0,
    currency: item.price.currency.toUpperCase(),
    active: !item.deleted && (item.quantity ?? 1) > 0,
  };
  const itemMutation = existingItem
    ? supabase.from("subscription_items").update(values).eq("id", existingItem.id)
    : supabase.from("subscription_items").insert(values);
  const { error } = await itemMutation;

  if (error) throw error;
}

export async function syncStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const existingSubscription = await findLocalSubscription(
    supabase,
    subscription,
  );
  const localSubscription = await updateLocalSubscription(
    supabase,
    subscription,
    existingSubscription,
  );
  const stripeItemIds = subscription.items.data.map((item) => item.id);
  await deactivateStaleStripeItems(supabase, localSubscription.id, stripeItemIds);

  for (const item of subscription.items.data) {
    await upsertStripeSubscriptionItem(supabase, localSubscription.id, item);
  }

  return localSubscription.id as string;
}
