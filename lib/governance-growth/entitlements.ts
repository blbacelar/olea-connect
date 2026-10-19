export type GovernanceFeature =
  | "board_evaluation"
  | "strategic_planning"
  | "board_training"
  | "ed_review";

export type GovernanceSubscription = {
  plan_id: string;
  status: string;
  current_period_end: string | null;
  subscription_items: Array<{ item_type: string; active: boolean }> | null;
};

export function hasGovernanceFeature(
  feature: GovernanceFeature,
  subscription: GovernanceSubscription | null,
  now = new Date(),
) {
  if (!subscription || !["active", "trialing"].includes(subscription.status)) return false;
  if (subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() <= now.getTime()) return false;

  const tier = subscription.plan_id;
  const included = feature === "board_evaluation"
    ? ["roots", "canopy", "harvest"].includes(tier)
    : ["canopy", "harvest"].includes(tier);
  return included || (subscription.subscription_items ?? []).some(
    (item) => item.item_type === feature && item.active,
  );
}
