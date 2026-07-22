import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getBillingSummary } from "@/lib/billing/server";
import {
  PAID_SEAT_QUANTITY_MAX,
  PAID_SEAT_QUANTITY_MIN,
} from "@/lib/billing/seat-pricing";
import {
  getBillingPortalConfigurationId,
  getStripePriceId,
  getStripe,
  getStripeSeatPriceId,
} from "@/lib/stripe/server";
import { syncStripeSubscription } from "@/lib/stripe/subscriptions";
import type { MembershipTier } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type BillingAction =
  | "manage"
  | "payment_method"
  | "subscription_update"
  | "cancel"
  | "pause"
  | "resume"
  | "add_seat"
  | "change_plan";

type BillingActionBody = {
  action?: BillingAction;
  idempotencyKey?: string;
  pauseDays?: number;
  seatQuantity?: number;
  targetPlanId?: MembershipTier;
};

class BillingActionError extends Error {
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

function parseActionBody(value: unknown): BillingActionBody {
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

function getSeatQuantity(value: number | undefined) {
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

function getIdempotencyKey(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BillingActionError("Billing update idempotency key is required.", 400);
  }

  if (!/^[A-Za-z0-9_-]{16,128}$/.test(normalized)) {
    throw new BillingActionError("Billing update idempotency key is invalid.", 400);
  }

  return normalized;
}

function getTargetPlanId(value: MembershipTier | undefined) {
  if (!value || !planIds.has(value)) {
    throw new BillingActionError("Choose a valid membership plan.", 400);
  }

  return value;
}

function assertPlanUpgradeAllowed(
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

function getBillingCycle(interval: "month" | "year"): "quarterly" | "annual" {
  return interval === "year" ? "annual" : "quarterly";
}

function isMembershipItem(item: Stripe.SubscriptionItem) {
  const metadata = item.price.metadata ?? {};

  return (
    metadata.item_type === "membership" ||
    Boolean(metadata.plan_id || metadata.olea_plan || metadata.tier)
  );
}

function getPortalFlowData(
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

function getPauseResumeTimestamp(days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new BillingActionError(
      "Membership pauses must be between 1 and 60 days.",
      400,
    );
  }

  return Math.floor((Date.now() + days * 24 * 60 * 60 * 1000) / 1000);
}

function assertSameOrigin(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!origin && !referer) {
    throw new BillingActionError("Billing requests must come from this app.", 403);
  }

  if (origin && origin !== expectedOrigin) {
    throw new BillingActionError("Billing requests must come from this app.", 403);
  }

  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== expectedOrigin) {
        throw new BillingActionError("Billing requests must come from this app.", 403);
      }
    } catch {
      throw new BillingActionError("Billing requests must come from this app.", 403);
    }
  }
}

function assertPauseTransition(action: "pause" | "resume", status: string) {
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

function assertSeatAdjustmentAllowed(status: string) {
  if (!seatAdjustableStatuses.has(status)) {
    throw new BillingActionError(
      "Only active or trialing memberships can add seats.",
      409,
    );
  }
}

async function createPaidSeatCheckout({
  idempotencyKey,
  organizationId,
  quantity,
  returnUrl,
  localSubscriptionId,
  customerId,
}: {
  idempotencyKey: string;
  organizationId: string;
  quantity: number;
  returnUrl: string;
  localSubscriptionId: string;
  customerId: string;
}) {
  const stripe = getStripe();
  const metadata = {
    item_type: "seat_purchase",
    local_subscription_id: localSubscriptionId,
    organization_id: organizationId,
    seat_quantity: String(quantity),
  };

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: customerId,
      client_reference_id: localSubscriptionId,
      line_items: [{ price: getStripeSeatPriceId(), quantity }],
      billing_address_collection: "required",
      metadata,
      payment_intent_data: { metadata },
      success_url: `${returnUrl}?seat=payment_submitted&quantity=${quantity}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?seat=payment_canceled`,
    },
    { idempotencyKey },
  );
}

async function changePlanSubscription({
  billingInterval,
  idempotencyKey,
  subscriptionId,
  targetPlanId,
}: {
  billingInterval: "month" | "year";
  idempotencyKey: string;
  subscriptionId: string;
  targetPlanId: MembershipTier;
}) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const membershipItem =
    subscription.items.data.find(isMembershipItem) ?? subscription.items.data[0];

  if (!membershipItem) {
    throw new BillingActionError(
      "Subscription billing does not have a membership item to upgrade.",
      409,
    );
  }

  return stripe.subscriptions.update(
    subscriptionId,
    {
      items: [
        {
          id: membershipItem.id,
          price: getStripePriceId(targetPlanId, getBillingCycle(billingInterval)),
          quantity: membershipItem.quantity ?? 1,
        },
      ],
      metadata: {
        ...subscription.metadata,
        plan_id: targetPlanId,
      },
      proration_behavior: "always_invoice",
    },
    { idempotencyKey },
  );
}

function retrieveSubscriptionForSync(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = parseActionBody(await request.json().catch(() => ({})));
    const action = body.action ?? "manage";
    const billing = await getBillingSummary();

    if (!billing) {
      return NextResponse.json(
        { error: "No organization subscription was found." },
        { status: 404 },
      );
    }
    if (billing.role !== "owner" && billing.role !== "admin") {
      return NextResponse.json(
        { error: "Only organization administrators can manage billing." },
        { status: 403 },
      );
    }
    if (!billing.customerId) {
      return NextResponse.json(
        { error: "Billing is not ready for this membership yet." },
        { status: 409 },
      );
    }
    if (!billing.subscriptionId) {
      return NextResponse.json(
        { error: "Subscription billing is not ready for this membership yet." },
        { status: 409 },
      );
    }

    const origin = new URL(request.url).origin;
    const returnUrl = `${origin}/subscription`;

    if (action === "add_seat") {
      assertSeatAdjustmentAllowed(billing.status);
      const session = await createPaidSeatCheckout({
        customerId: billing.customerId,
        idempotencyKey: getIdempotencyKey(body.idempotencyKey),
        localSubscriptionId: billing.localSubscriptionId,
        organizationId: billing.organizationId,
        quantity: getSeatQuantity(body.seatQuantity),
        returnUrl,
      });

      if (!session.url) {
        throw new Error("Seat payment did not return a checkout URL.");
      }

      return NextResponse.json({ ok: true, url: session.url });
    }

    if (action === "pause" || action === "resume" || action === "change_plan") {
      if (action === "change_plan") {
        assertSeatAdjustmentAllowed(billing.status);
        const targetPlanId = getTargetPlanId(body.targetPlanId);
        assertPlanUpgradeAllowed(
          billing.planId,
          targetPlanId,
          billing.cancelAtPeriodEnd,
        );
      } else {
        assertPauseTransition(action, billing.status);
      }
      const subscription =
        action === "pause"
          ? await getStripe().subscriptions.update(billing.subscriptionId, {
              pause_collection: {
                behavior: "void",
                resumes_at: getPauseResumeTimestamp(body.pauseDays ?? 30),
              },
            })
          : action === "resume"
            ? await getStripe().subscriptions.update(billing.subscriptionId, {
                pause_collection: "",
              })
            : await changePlanSubscription({
                billingInterval: billing.billingInterval,
                idempotencyKey: getIdempotencyKey(body.idempotencyKey),
                subscriptionId: billing.subscriptionId,
                targetPlanId: getTargetPlanId(body.targetPlanId),
              });

      try {
        await syncStripeSubscription(
          createAdminClient(),
          await retrieveSubscriptionForSync(subscription.id),
        );
      } catch (syncError) {
        console.error("Stripe billing action succeeded but local sync failed", {
          action,
          subscriptionId: subscription.id,
          syncError,
        });
        if (action === "change_plan") {
          return NextResponse.json(
            {
              ok: false,
              pendingSync: true,
              message: "The plan upgrade was confirmed, but local access is still syncing.",
            },
            { status: 202 },
          );
        }
      }
      return NextResponse.json({
        ok: true,
        ...(action === "change_plan" ? { planId: body.targetPlanId } : {}),
      });
    }

    if (
      action !== "manage" &&
      action !== "payment_method" &&
      action !== "subscription_update" &&
      action !== "cancel"
    ) {
      return NextResponse.json(
        { error: "Unsupported billing action." },
        { status: 400 },
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      configuration: await getBillingPortalConfigurationId(),
      customer: billing.customerId,
      flow_data: getPortalFlowData(action, billing.subscriptionId, returnUrl),
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe billing portal session", error);
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
}
