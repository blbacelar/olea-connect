import type Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  PAID_SEAT_QUANTITY_MAX,
  PAID_SEAT_QUANTITY_MIN,
} from "@/lib/billing/seat-pricing";
import { logError } from "@/lib/observability/logger";
import type { MembershipTier } from "@/lib/types";

export type BillingAction =
  | "manage"
  | "payment_method"
  | "subscription_update"
  | "cancel"
  | "pause"
  | "resume"
  | "add_seat"
  | "change_plan";

export type BillingActionBody = {
  action?: BillingAction;
  idempotencyKey?: string;
  pauseDays?: number;
  seatQuantity?: number;
  targetPlanId?: MembershipTier;
};

export type ManageableBillingFields = {
  customerId: string;
  localSubscriptionId: string;
  subscriptionId: string;
};

export class BillingActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const pauseableStatuses = new Set(["active", "trialing"]);
const resumableStatuses = new Set(["paused"]);
const seatAdjustableStatuses = new Set(["active", "trialing"]);
const planOrder: Record<MembershipTier, number> = {
  seedling: 0,
  roots: 1,
  canopy: 2,
  harvest: 3,
};
const planIds = new Set<MembershipTier>([
  "seedling",
  "roots",
  "canopy",
  "harvest",
]);
const portalActions = new Set<BillingAction>([
  "manage",
  "payment_method",
  "subscription_update",
  "cancel",
]);

export function parseActionBody(value: unknown): BillingActionBody {
  if (!value || typeof value !== "object") return {};
  const body = value as BillingActionBody;
  return {
    action: body.action,
    idempotencyKey: body.idempotencyKey,
    pauseDays: body.pauseDays,
    seatQuantity: body.seatQuantity,
    targetPlanId: body.targetPlanId,
  };
}

export function getSeatQuantity(value: number | undefined) {
  const quantity = value ?? 1;
  if (
    !Number.isInteger(quantity) ||
    quantity < PAID_SEAT_QUANTITY_MIN ||
    quantity > PAID_SEAT_QUANTITY_MAX
  ) {
    throw new BillingActionError(
      `Paid seat quantity must be between ${PAID_SEAT_QUANTITY_MIN} and ${PAID_SEAT_QUANTITY_MAX}.`,
      400,
    );
  }

  return quantity;
}

export function getIdempotencyKey(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BillingActionError("Billing update idempotency key is required.", 400);
  }

  if (!/^[A-Za-z0-9_-]{16,128}$/.test(normalized)) {
    throw new BillingActionError("Billing update idempotency key is invalid.", 400);
  }

  return normalized;
}

export function getTargetPlanId(value: MembershipTier | undefined) {
  if (!value || !planIds.has(value)) {
    throw new BillingActionError("Choose a valid membership plan.", 400);
  }

  return value;
}

export function assertPlanUpgradeAllowed(
  currentPlanId: string,
  targetPlanId: MembershipTier,
  cancelAtPeriodEnd: boolean,
) {
  if (cancelAtPeriodEnd) {
    throw new BillingActionError(
      "Cancel the scheduled cancellation before upgrading your plan.",
      409,
    );
  }

  if (!planIds.has(currentPlanId as MembershipTier)) {
    throw new BillingActionError(
      "Current membership plan cannot be upgraded automatically.",
      409,
    );
  }

  const currentPlan = currentPlanId as MembershipTier;
  if (planOrder[targetPlanId] <= planOrder[currentPlan]) {
    throw new BillingActionError(
      "Plan changes here only support upgrades. Contact support for downgrades.",
      409,
    );
  }
}

export function getBillingCycle(
  interval: "month" | "year",
): "quarterly" | "annual" {
  return interval === "year" ? "annual" : "quarterly";
}

export function isMembershipItem(item: Stripe.SubscriptionItem) {
  const metadata = item.price.metadata ?? {};

  return (
    metadata.item_type === "membership" ||
    Boolean(metadata.plan_id || metadata.olea_plan || metadata.tier)
  );
}

export function getPortalFlowData(
  action: BillingAction,
  subscriptionId: string,
  returnUrl: string,
): Stripe.BillingPortal.SessionCreateParams.FlowData | undefined {
  const after_completion = {
    type: "redirect" as const,
    redirect: { return_url: returnUrl },
  };

  if (action === "payment_method") {
    return {
      after_completion,
      type: "payment_method_update",
    };
  }

  if (action === "cancel") {
    return {
      after_completion,
      subscription_cancel: { subscription: subscriptionId },
      type: "subscription_cancel",
    };
  }

  return undefined;
}

export function getPauseResumeTimestamp(days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new BillingActionError(
      "Membership pauses must be between 1 and 60 days.",
      400,
    );
  }

  return Math.floor((Date.now() + days * 24 * 60 * 60 * 1000) / 1000);
}

export function assertSameOrigin(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!origin && !referer) {
    throw new BillingActionError("Billing requests must come from this app.", 403);
  }

  if (origin && origin !== expectedOrigin) {
    throw new BillingActionError("Billing requests must come from this app.", 403);
  }

  assertRefererOrigin({ expectedOrigin, origin, referer });
}

export function assertPauseTransition(action: "pause" | "resume", status: string) {
  if (action === "pause" && !pauseableStatuses.has(status)) {
    throw new BillingActionError(
      "Only active or trialing memberships can be paused.",
      409,
    );
  }

  if (action === "resume" && !resumableStatuses.has(status)) {
    throw new BillingActionError("Only paused memberships can be resumed.", 409);
  }
}

export function assertSeatAdjustmentAllowed(status: string) {
  if (!seatAdjustableStatuses.has(status)) {
    throw new BillingActionError(
      "Only active or trialing memberships can add seats.",
      409,
    );
  }
}

export function assertSupportedPortalAction(action: BillingAction) {
  if (!portalActions.has(action)) {
    throw new BillingActionError("Unsupported billing action.", 400);
  }
}

export function getSeatCheckoutMetadata({
  localSubscriptionId,
  organizationId,
  quantity,
}: {
  localSubscriptionId: string;
  organizationId: string;
  quantity: number;
}) {
  return {
    item_type: "seat_purchase",
    local_subscription_id: localSubscriptionId,
    organization_id: organizationId,
    seat_quantity: String(quantity),
  };
}

export function getSeatCheckoutUrls({
  quantity,
  returnUrl,
}: {
  quantity: number;
  returnUrl: string;
}) {
  return {
    cancel_url: `${returnUrl}?seat=payment_canceled`,
    success_url: `${returnUrl}?seat=payment_submitted&quantity=${quantity}&session_id={CHECKOUT_SESSION_ID}`,
  };
}

export function isSubscriptionMutation(
  action: BillingAction,
): action is "pause" | "resume" | "change_plan" {
  return action === "pause" || action === "resume" || action === "change_plan";
}

export function getPendingPlanSyncResponse() {
  return NextResponse.json(
    {
      ok: false,
      pendingSync: true,
      message: "The plan upgrade was confirmed, but local access is still syncing.",
    },
    { status: 202 },
  );
}

export function getBillingActionErrorResponse(error: unknown) {
  logError("Unable to create Stripe billing portal session", error);
  const status = error instanceof BillingActionError ? error.status : 500;
  return NextResponse.json(
    {
      error:
        error instanceof BillingActionError
          ? error.message
          : "Unable to open billing management.",
    },
    { status },
  );
}

function assertRefererOrigin({
  expectedOrigin,
  origin,
  referer,
}: {
  expectedOrigin: string;
  origin: string | null;
  referer: string | null;
}) {
  if (origin || !referer) return;

  try {
    if (new URL(referer).origin === expectedOrigin) return;
  } catch {
    throw new BillingActionError("Billing requests must come from this app.", 403);
  }

  throw new BillingActionError("Billing requests must come from this app.", 403);
}
