import { apiRoutes } from "@/lib/api-routes";
import { membershipPlans } from "@/lib/plans";
import type { MembershipTier } from "@/lib/types";

import { createBillingUpdateIdempotencyKey } from "./billing-action-utils";

export type BillingInterval = "month" | "year";
export type MembershipPlanOption = (typeof membershipPlans)[number];

const planOrder: Record<MembershipTier, number> = {
  canopy: 2,
  harvest: 3,
  roots: 1,
  seedling: 0,
};

export function getUpgradeOptions(currentPlanId: MembershipTier) {
  return membershipPlans.filter(
    (plan) => planOrder[plan.id] > planOrder[currentPlanId],
  );
}

export function getMembershipPlan(planId: MembershipTier) {
  return membershipPlans.find((plan) => plan.id === planId);
}

export function getPlanPriceLabel(planId: MembershipTier, interval: BillingInterval) {
  const plan = membershipPlans.find((item) => item.id === planId);
  if (!plan) return "";

  const amount = interval === "year" ? plan.annualPrice : plan.quarterlyPrice;
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    style: "currency",
  }).format(amount);
}

export function getBillingIntervalLabel(interval: BillingInterval) {
  return interval === "year" ? "year" : "quarter";
}

export async function submitPlanUpgrade({
  onError,
  onPendingSync,
  targetPlanId,
}: {
  onError: (message: string) => void;
  onPendingSync: (message: string) => void;
  targetPlanId: MembershipTier;
}) {
  onError("");
  try {
    const response = await fetch(apiRoutes.stripePortal, {
      body: JSON.stringify({
        action: "change_plan",
        idempotencyKey: createBillingUpdateIdempotencyKey("plan"),
        targetPlanId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    handlePlanUpgradeResponse(response, result, {
      onError,
      onPendingSync,
      targetPlanId,
    });
  } catch {
    onError("Unable to reach billing management. Please try again.");
  }
}

function handlePlanUpgradeResponse(
  response: Response,
  result: { error?: string; message?: string },
  handlers: {
    onError: (message: string) => void;
    onPendingSync: (message: string) => void;
    targetPlanId: MembershipTier;
  },
) {
  if (response.status === 202) {
    handlers.onPendingSync(
      result.message ??
        "Your plan upgrade was confirmed. Platform access is still syncing and should update shortly.",
    );
    return;
  }

  if (!response.ok) {
    handlers.onError(result.error ?? "Unable to upgrade your plan.");
    return;
  }

  window.location.assign(`/subscription?plan=upgraded&tier=${handlers.targetPlanId}`);
}
