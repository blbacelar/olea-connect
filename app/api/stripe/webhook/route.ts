import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, getWebhookSecret } from "@/lib/stripe/server";
import {
  attemptWorkspaceProvisioning,
  recordStripeSubscription,
} from "@/lib/stripe/registration";
import { syncStripeSubscription } from "@/lib/stripe/subscriptions";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type InvoiceWithLegacySubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacyInvoice = invoice as InvoiceWithLegacySubscription;
  const reference =
    invoice.parent?.subscription_details?.subscription ??
    legacyInvoice.subscription;

  if (!reference) return null;
  return typeof reference === "string" ? reference : reference.id;
}

async function claimWebhookEvent(event: Stripe.Event) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_stripe_webhook", {
    target_event_id: event.id,
    target_event_type: event.type,
    target_payload: event,
  });

  if (error) throw error;
  return { supabase, claimed: data === true };
}

async function getEventSubscription(event: Stripe.Event) {
  const stripe = getStripe();

  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription;
    return event.type === "customer.subscription.deleted"
      ? subscription
      : stripe.subscriptions.retrieve(subscription.id);
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    return subscriptionId
      ? stripe.subscriptions.retrieve(subscriptionId)
      : null;
  }

  if (event.type.startsWith("invoice.")) {
    const subscriptionId = getInvoiceSubscriptionId(
      event.data.object as Stripe.Invoice,
    );
    return subscriptionId
      ? stripe.subscriptions.retrieve(subscriptionId)
      : null;
  }

  return null;
}

async function notifyOrganizationOwners(
  organizationId: string,
  notification: {
    severity: "info" | "success" | "warning" | "critical";
    type: string;
    title: string;
    body: string;
  },
) {
  const supabase = createAdminClient();
  const { data: owners, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
    .eq("status", "active");

  if (error) throw error;
  if (!owners?.length) return;

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert(
      owners.map(({ user_id }) => ({
        user_id,
        organization_id: organizationId,
        action_url: "/subscription",
        ...notification,
      })),
    );

  if (notificationError) throw notificationError;
}

async function handleLifecycleNotification(
  event: Stripe.Event,
  subscription: Stripe.Subscription | null,
) {
  if (!subscription) return;
  const organizationId = subscription.metadata.organization_id;
  if (!organizationId) return;

  if (
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.payment_action_required"
  ) {
    await notifyOrganizationOwners(organizationId, {
      severity: "critical",
      type: "billing_payment_failed",
      title: "Payment needs attention",
      body: "Update your payment method to restore full platform access.",
    });
  } else if (event.type === "invoice.paid") {
    await notifyOrganizationOwners(organizationId, {
      severity: "success",
      type: "billing_payment_succeeded",
      title: "Payment received",
      body: "Your Olea Connects membership payment was successful.",
    });
  } else if (event.type === "customer.subscription.deleted") {
    await notifyOrganizationOwners(organizationId, {
      severity: "warning",
      type: "billing_subscription_canceled",
      title: "Membership canceled",
      body: "Your Olea Connects membership is no longer active.",
    });
  } else if (
    event.type === "customer.subscription.paused" ||
    subscription.pause_collection
  ) {
    await notifyOrganizationOwners(organizationId, {
      severity: "warning",
      type: "billing_subscription_paused",
      title: "Membership paused",
      body: "Your membership is paused. Manage billing to resume access.",
    });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      getWebhookSecret(),
    );
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const { supabase, claimed } = await claimWebhookEvent(event);
    if (!claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const subscription = await getEventSubscription(event);
    if (subscription) {
      const provisioningRequestId = await recordStripeSubscription(
        supabase,
        subscription,
      );

      if (provisioningRequestId) {
        await attemptWorkspaceProvisioning(
          supabase,
          provisioningRequestId,
          subscription,
        );
      } else {
        await syncStripeSubscription(supabase, subscription);
      }
    }
    await handleLifecycleNotification(event, subscription);

    const { error: processedError } = await supabase
      .from("webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_started_at: null,
        processing_error: null,
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);

    if (processedError) throw processedError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Unable to process Stripe event ${event.id}`, error);
    const supabase = createAdminClient();
    await supabase
      .from("webhook_events")
      .update({
        processing_started_at: null,
        processing_error:
          error instanceof Error ? error.message : "Unknown processing error",
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
