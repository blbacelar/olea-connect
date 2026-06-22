import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getBillingSummary } from "@/lib/billing/server";
import {
  getBillingPortalConfigurationId,
  getStripe,
  getStripeSeatPriceId,
} from "@/lib/stripe/server";
import { syncStripeSubscription } from "@/lib/stripe/subscriptions";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type BillingAction =
  | "manage"
  | "payment_method"
  | "subscription_update"
  | "cancel"
  | "pause"
  | "resume"
  | "add_seat";

type BillingActionBody = {
  action?: BillingAction;
  pauseDays?: number;
  seatQuantity?: number;
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

function parseActionBody(value: unknown): BillingActionBody {
  if (!value || typeof value !== "object") return {};
  const body = value as BillingActionBody;
  return {
    action: body.action,
    pauseDays: body.pauseDays,
    seatQuantity: body.seatQuantity,
  };
}

function getSeatQuantity(value: number | undefined) {
  const quantity = value ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
    throw new BillingActionError(
      "Paid seat quantity must be between 1 and 3.",
      400,
    );
  }

  return quantity;
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

  if (action === "subscription_update") {
    return {
      after_completion,
      subscription_update: { subscription: subscriptionId },
      type: "subscription_update",
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

async function addSeatToSubscription(subscriptionId: string, quantity: number) {
  const stripe = getStripe();
  const seatPriceId = getStripeSeatPriceId();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const seatItem = subscription.items.data.find((item) => {
    const priceId =
      typeof item.price === "string" ? item.price : item.price.id;
    return priceId === seatPriceId;
  });

  return stripe.subscriptions.update(subscriptionId, {
    items: seatItem
      ? [
          {
            id: seatItem.id,
            quantity: (seatItem.quantity ?? 0) + quantity,
          },
        ]
      : [
          {
            price: seatPriceId,
            quantity,
          },
        ],
    proration_behavior: "always_invoice",
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
        { error: "Stripe billing is not ready for this membership yet." },
        { status: 409 },
      );
    }
    if (!billing.subscriptionId) {
      return NextResponse.json(
        { error: "Stripe subscription is not ready for this membership yet." },
        { status: 409 },
      );
    }

    const origin = new URL(request.url).origin;
    const returnUrl = `${origin}/subscription`;

    if (action === "pause" || action === "resume" || action === "add_seat") {
      if (action === "add_seat") {
        assertSeatAdjustmentAllowed(billing.status);
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
            : await addSeatToSubscription(
                billing.subscriptionId,
                getSeatQuantity(body.seatQuantity),
              );

      try {
        await syncStripeSubscription(createAdminClient(), subscription);
      } catch (syncError) {
        console.error("Stripe billing action succeeded but local sync failed", {
          action,
          subscriptionId: subscription.id,
          syncError,
        });
      }
      return NextResponse.json({ ok: true });
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
          error instanceof Error
            ? error.message
            : "Unable to open billing management.",
      },
      { status },
    );
  }
}
