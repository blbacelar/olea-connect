import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPlanId,
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";
import { getStripe } from "@/lib/stripe/server";
import {
  PAID_SEAT_PRICE_CENTS,
  PAID_SEAT_CURRENCY,
  PAID_SEAT_QUANTITY_MAX,
  PAID_SEAT_QUANTITY_MIN,
} from "@/lib/billing/seat-pricing";
import type { MembershipTier, RegistrationState } from "@/lib/types";

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
    .eq("subscription_id", localSubscription.id)
    .not("provider_item_id", "like", "seat_purchase:%");
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

/**
 * Records a paid one-time seat checkout as a local entitlement. The webhook
 * and the return path can both call this safely because the checkout session
 * ID is the idempotency key stored in provider_item_id.
 */
export async function syncPaidSeatCheckout(
  supabase: SupabaseClient,
  eventSession: Stripe.Checkout.Session,
) {
  if (
    eventSession.mode !== "payment" ||
    eventSession.payment_status !== "paid" ||
    eventSession.metadata?.item_type !== "seat_purchase"
  ) {
    return null;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
    expand: ["line_items.data.price"],
  });
  const lineItems = session.line_items?.data ?? [];
  const lineItem = lineItems.length === 1 ? lineItems[0] : undefined;
  const price = lineItem?.price;
  const quantity = lineItem?.quantity ?? 0;
  const localSubscriptionId = session.metadata?.local_subscription_id;
  const organizationId = session.metadata?.organization_id;
  const expectedQuantity = Number(session.metadata?.seat_quantity);

  if (
    !lineItem ||
    !price ||
    price.type !== "one_time" ||
    price.unit_amount !== PAID_SEAT_PRICE_CENTS ||
    price.currency.toUpperCase() !== PAID_SEAT_CURRENCY ||
    !Number.isInteger(quantity) ||
    quantity < PAID_SEAT_QUANTITY_MIN ||
    quantity > PAID_SEAT_QUANTITY_MAX ||
    quantity !== expectedQuantity ||
    !localSubscriptionId ||
    !organizationId
  ) {
    throw new Error("Paid seat checkout did not match the approved price.");
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("id, organization_id, provider_customer_id, status")
    .eq("id", localSubscriptionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (!subscription) throw new Error("Paid seat checkout has no local subscription.");
  if (subscription.provider_customer_id !== customerId) {
    throw new Error("Paid seat checkout customer does not match the organization.");
  }
  if (!["active", "trialing"].includes(subscription.status)) {
    throw new Error("Paid seat checkout requires an active membership.");
  }

  const providerItemId = `seat_purchase:${session.id}`;
  const { data: existingItem, error: existingItemError } = await supabase
    .from("subscription_items")
    .select("id")
    .eq("provider_item_id", providerItemId)
    .maybeSingle();

  if (existingItemError) throw existingItemError;
  if (existingItem) return subscription.id as string;

  const { error: insertError } = await supabase
    .from("subscription_items")
    .upsert(
      {
        active: true,
        item_type: "seat",
        provider_item_id: providerItemId,
        quantity,
        subscription_id: subscription.id,
        unit_amount_cents: price.unit_amount,
        currency: price.currency.toUpperCase(),
      },
      { onConflict: "provider_item_id", ignoreDuplicates: true },
    );

  if (insertError) throw insertError;
  return subscription.id as string;
}
