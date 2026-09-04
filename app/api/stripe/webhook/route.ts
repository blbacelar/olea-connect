import { NextResponse } from "next/server";

import {
  getRequestContext,
  logError,
  logWarn,
} from "@/lib/observability/logger";
import { getStripe, getWebhookSecret } from "@/lib/stripe/server";

import {
  processStripeWebhookEvent,
  recordStripeWebhookFailure,
} from "./webhook-processing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestContext = getRequestContext(request, {
    component: "stripe_webhook",
    provider: "stripe",
  });
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logWarn("Stripe webhook rejected without signature", requestContext);
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const event = await constructWebhookEvent(request, signature, requestContext);
  if (!event) {
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const result = await processStripeWebhookEvent(event, requestContext);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    await recordStripeWebhookFailure(event, error, requestContext);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}

async function constructWebhookEvent(
  request: Request,
  signature: string,
  requestContext: ReturnType<typeof getRequestContext>,
) {
  try {
    const payload = await request.text();
    return getStripe().webhooks.constructEvent(
      payload,
      signature,
      getWebhookSecret(),
    );
  } catch (error) {
    logError("Invalid Stripe webhook signature", error, requestContext);
    return null;
  }
}
