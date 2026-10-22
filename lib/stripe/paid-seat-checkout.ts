import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PAID_SEAT_CURRENCY,
  PAID_SEAT_PRICE_CENTS,
  PAID_SEAT_QUANTITY_MAX,
  PAID_SEAT_QUANTITY_MIN,
} from "@/lib/billing/seat-pricing";
import { getStripe } from "@/lib/stripe/server";

function isPaidSeatCheckout(eventSession: Stripe.Checkout.Session) {
  return (
    eventSession.mode === "payment" &&
    eventSession.payment_status === "paid" &&
    eventSession.metadata?.item_type === "seat_purchase"
  );
}

async function retrievePaidSeatSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price"],
  });
}

function getPaidSeatCheckoutContext(session: Stripe.Checkout.Session) {
  const lineItems = session.line_items?.data ?? [];
  const lineItem = lineItems.length === 1 ? lineItems[0] : undefined;

  return {
    expectedQuantity: Number(session.metadata?.seat_quantity),
    lineItem,
    localSubscriptionId: session.metadata?.local_subscription_id,
    organizationId: session.metadata?.organization_id,
    price: lineItem?.price,
    quantity: lineItem?.quantity ?? 0,
  };
}

type PaidSeatCheckoutContext = ReturnType<typeof getPaidSeatCheckoutContext>;
type ValidPaidSeatCheckoutContext = PaidSeatCheckoutContext & {
  lineItem: Stripe.LineItem;
  localSubscriptionId: string;
  organizationId: string;
  price: Stripe.Price;
};

function assertValidPaidSeatCheckout(
  checkout: PaidSeatCheckoutContext,
): asserts checkout is ValidPaidSeatCheckoutContext {
  const hasValidQuantity =
    Number.isInteger(checkout.quantity) &&
    checkout.quantity >= PAID_SEAT_QUANTITY_MIN &&
    checkout.quantity <= PAID_SEAT_QUANTITY_MAX &&
    checkout.quantity === checkout.expectedQuantity;
  const hasApprovedPrice =
    checkout.price?.type === "one_time" &&
    checkout.price.unit_amount === PAID_SEAT_PRICE_CENTS &&
    checkout.price.currency.toUpperCase() === PAID_SEAT_CURRENCY;

  if (!checkout.lineItem || !hasApprovedPrice || !hasValidQuantity) {
    throw new Error("Paid seat checkout did not match the approved price.");
  }
  if (!checkout.localSubscriptionId || !checkout.organizationId) {
    throw new Error("Paid seat checkout did not include organization metadata.");
  }
}

async function findPaidSeatSubscription(
  supabase: SupabaseClient,
  localSubscriptionId: string,
  organizationId: string,
) {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, organization_id, provider_customer_id, status")
    .eq("id", localSubscriptionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!subscription) throw new Error("Paid seat checkout has no local subscription.");
  return subscription;
}

function assertPaidSeatSubscriptionMatches(
  subscription: {
    provider_customer_id: string | null;
    status: string;
  },
  customerId: string | undefined,
) {
  if (subscription.provider_customer_id !== customerId) {
    throw new Error("Paid seat checkout customer does not match the organization.");
  }
  if (!["active", "trialing"].includes(subscription.status)) {
    throw new Error("Paid seat checkout requires an active membership.");
  }
}

async function hasExistingPaidSeatItem(
  supabase: SupabaseClient,
  providerItemId: string,
) {
  const { data: existingItem, error } = await supabase
    .from("subscription_items")
    .select("id")
    .eq("provider_item_id", providerItemId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(existingItem);
}

async function insertPaidSeatItem({
  price,
  providerItemId,
  quantity,
  subscriptionId,
  supabase,
}: {
  price: Stripe.Price;
  providerItemId: string;
  quantity: number;
  subscriptionId: string;
  supabase: SupabaseClient;
}) {
  const { error } = await supabase.from("subscription_items").upsert(
    {
      active: true,
      item_type: "seat",
      provider_item_id: providerItemId,
      quantity,
      subscription_id: subscriptionId,
      unit_amount_cents: price.unit_amount,
      currency: price.currency.toUpperCase(),
    },
    { onConflict: "provider_item_id", ignoreDuplicates: true },
  );

  if (error) throw error;
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
  if (!isPaidSeatCheckout(eventSession)) {
    return null;
  }

  const session = await retrievePaidSeatSession(eventSession.id);
  const checkout = getPaidSeatCheckoutContext(session);
  assertValidPaidSeatCheckout(checkout);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscription = await findPaidSeatSubscription(
    supabase,
    checkout.localSubscriptionId,
    checkout.organizationId,
  );
  assertPaidSeatSubscriptionMatches(subscription, customerId);

  const providerItemId = `seat_purchase:${session.id}`;
  if (await hasExistingPaidSeatItem(supabase, providerItemId)) {
    return subscription.id as string;
  }

  await insertPaidSeatItem({
    price: checkout.price,
    providerItemId,
    quantity: checkout.quantity,
    subscriptionId: subscription.id,
    supabase,
  });
  return subscription.id as string;
}
