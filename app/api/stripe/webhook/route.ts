import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  buildCircleProvisioningPayload,
  enqueueCircleMemberSync,
} from "@/lib/circle/provisioning";
import { enqueueSubscriptionIntegrationSyncs } from "@/lib/integrations/subscription-sync";
import {
  getRequestContext,
  logCritical,
  logError,
  logInfo,
  logWarn,
} from "@/lib/observability/logger";
import { getStripe, getWebhookSecret } from "@/lib/stripe/server";
import {
  attemptWorkspaceProvisioning,
  recordStripeSubscription,
} from "@/lib/stripe/registration";
import {
  syncPaidSeatCheckout,
  syncStripeSubscription,
} from "@/lib/stripe/subscriptions";
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
    idempotencyKey: string;
  },
) {
  const supabase = createAdminClient();
  const { idempotencyKey, ...notificationFields } = notification;
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
    .upsert(
      owners.map(({ user_id }) => ({
        user_id,
        organization_id: organizationId,
        action_url: "/subscription",
        idempotency_key: `${idempotencyKey}:${user_id}`,
        ...notificationFields,
      })),
      {
        ignoreDuplicates: true,
        onConflict: "user_id,idempotency_key",
      },
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
      idempotencyKey: `billing_payment_failed:${event.id}`,
    });
  } else if (event.type === "invoice.paid") {
    await notifyOrganizationOwners(organizationId, {
      severity: "success",
      type: "billing_payment_succeeded",
      title: "Payment received",
      body: "Your Olea Connects membership payment was successful.",
      idempotencyKey: `billing_payment_succeeded:${event.id}`,
    });
  } else if (event.type === "customer.subscription.deleted") {
    await notifyOrganizationOwners(organizationId, {
      severity: "warning",
      type: "billing_subscription_canceled",
      title: "Membership canceled",
      body: "Your Olea Connects membership is no longer active.",
      idempotencyKey: `billing_subscription_canceled:${event.id}`,
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
      idempotencyKey: `billing_subscription_paused:${event.id}`,
    });
  }
}

async function enqueueCircleSubscriptionAccessSync(
  subscription: Stripe.Subscription | null,
) {
  if (!subscription?.metadata.organization_id) return;

  const organizationId = subscription.metadata.organization_id;
  const supabase = createAdminClient();
  const [
    { data: organization, error: organizationError },
    { data: localSubscription, error: localSubscriptionError },
    { data: members, error: membersError },
  ] = await Promise.all([
    supabase.from("organizations").select("id, name").eq("id", organizationId).single(),
    supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("organization_id", organizationId)
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscription.id)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("user_id, role, status")
      .eq("organization_id", organizationId),
  ]);

  if (organizationError) throw organizationError;
  if (localSubscriptionError) throw localSubscriptionError;
  if (membersError) throw membersError;

  const activeSubscription = ["active", "trialing"].includes(
    localSubscription?.status ?? subscription.status,
  );
  const tier = (localSubscription?.plan_id ?? "seedling") as
    | "seedling"
    | "roots"
    | "canopy"
    | "harvest";

  await Promise.all(
    (members ?? []).map(async (memberRow) => {
      const [
        { data: profile, error: profileError },
        {
          data: { user },
          error: userError,
        },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", memberRow.user_id)
          .maybeSingle(),
        supabase.auth.admin.getUserById(memberRow.user_id),
      ]);
      if (profileError) throw profileError;
      if (userError) throw userError;
      if (!user?.email) return null;

      const activeMember = memberRow.status === "active";

      return enqueueCircleMemberSync(
        supabase,
        buildCircleProvisioningPayload({
          action: activeSubscription && activeMember ? "provision" : "deprovision",
          member: {
            id: memberRow.user_id,
            organizationId,
            name: profile?.full_name ?? "Member",
            firstName: profile?.full_name?.split(/\s+/)[0] ?? "Member",
            role: memberRow.role,
            membershipRole: memberRow.role,
            email: user.email,
          },
          organization: {
            id: organization.id,
            name: organization.name,
            tier,
            seatsUsed: 0,
            seatLimit: 0,
            renewalDate: "",
            brandComplete: false,
            brand: {
              organizationName: organization.name,
              logoInitials: "OC",
              primaryColor: "#446B52",
              secondaryColor: "#F4EFE4",
            },
          },
          reason: `stripe_subscription_${subscription.status}`,
        }),
      );
    }),
  );
}

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

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      getWebhookSecret(),
    );
  } catch (error) {
    logError("Invalid Stripe webhook signature", error, requestContext);
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const { supabase, claimed } = await claimWebhookEvent(event);
    const eventContext = {
      ...requestContext,
      eventId: event.id,
      eventType: event.type,
    };
    if (!claimed) {
      logInfo("Duplicate Stripe webhook ignored", eventContext);
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await syncPaidSeatCheckout(
        supabase,
        event.data.object as Stripe.Checkout.Session,
      );
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
    await enqueueCircleSubscriptionAccessSync(subscription);
    await enqueueSubscriptionIntegrationSyncs(supabase, subscription);

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
    logInfo("Stripe webhook processed", eventContext);
    return NextResponse.json({ received: true });
  } catch (error) {
    logCritical("Unable to process Stripe webhook", error, {
      ...requestContext,
      eventId: event.id,
      eventType: event.type,
      provider: "stripe",
    });
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
