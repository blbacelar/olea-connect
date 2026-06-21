import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getBillingSummary } from "@/lib/billing/server";
import {
  getBillingPortalConfigurationId,
  getStripe,
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
  | "resume";

type BillingActionBody = {
  action?: BillingAction;
  pauseDays?: number;
};

function parseActionBody(value: unknown): BillingActionBody {
  if (!value || typeof value !== "object") return {};
  const body = value as BillingActionBody;
  return {
    action: body.action,
    pauseDays: body.pauseDays,
  };
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
    throw new Error("Membership pauses must be between 1 and 60 days.");
  }

  return Math.floor((Date.now() + days * 24 * 60 * 60 * 1000) / 1000);
}

export async function POST(request: Request) {
  try {
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

    if (action === "pause" || action === "resume") {
      const stripe = getStripe();
      const subscription =
        action === "pause"
          ? await stripe.subscriptions.update(billing.subscriptionId, {
              pause_collection: {
                behavior: "void",
                resumes_at: getPauseResumeTimestamp(body.pauseDays ?? 30),
              },
            })
          : await stripe.subscriptions.update(billing.subscriptionId, {
              pause_collection: "",
            });

      await syncStripeSubscription(createAdminClient(), subscription);
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open billing management.",
      },
      { status: 500 },
    );
  }
}
