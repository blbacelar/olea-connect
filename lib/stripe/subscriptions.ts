import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPlanId,
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";

export async function syncStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const localSubscriptionId = subscription.metadata.local_subscription_id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const firstItem = subscription.items.data[0];
  const planId = getPlanId(firstItem);
  const billingInterval = firstItem?.price.recurring?.interval;

  let lookup = supabase
    .from("subscriptions")
    .select("id, metadata");
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
      quantity: firstItem?.quantity ?? 1,
      current_period_start: toIsoDate(firstItem?.current_period_start),
      current_period_end: toIsoDate(firstItem?.current_period_end),
      pause_starts_at: subscription.pause_collection
        ? new Date().toISOString()
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
        stripe_price_id: firstItem?.price.id,
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
      item_type: item.price.metadata.item_type || "membership",
      provider_item_id: item.id,
      quantity: item.quantity ?? 1,
      unit_amount_cents: item.price.unit_amount ?? 0,
      currency: item.price.currency.toUpperCase(),
      active: !item.deleted,
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
