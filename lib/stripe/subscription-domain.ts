import type Stripe from "stripe";

export type LocalSubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "unpaid";

export function toIsoDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export function mapSubscriptionStatus(
  subscription: Stripe.Subscription,
): LocalSubscriptionStatus {
  if (subscription.pause_collection) return "paused";

  switch (subscription.status) {
    case "trialing":
    case "active":
    case "past_due":
    case "paused":
    case "unpaid":
    case "incomplete":
      return subscription.status;
    case "canceled":
    case "incomplete_expired":
      return "canceled";
  }
}

export function getPlanId(item: Stripe.SubscriptionItem | undefined) {
  return (
    item?.price.metadata.plan_id ||
    item?.price.metadata.olea_plan ||
    item?.price.metadata.tier ||
    null
  );
}
