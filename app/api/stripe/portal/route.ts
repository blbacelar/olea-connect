import { NextResponse } from "next/server";

import { getBillingSummary } from "@/lib/billing/server";
import {
  getBillingPortalConfigurationId,
  getStripe,
  getStripePriceId,
  getStripeSeatPriceId,
} from "@/lib/stripe/server";
import { logError } from "@/lib/observability/logger";
import { syncStripeSubscription } from "@/lib/stripe/subscriptions";
import type { MembershipTier } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  BillingActionError,
  assertPauseTransition,
  assertPlanUpgradeAllowed,
  assertSameOrigin,
  assertSeatAdjustmentAllowed,
  assertSupportedPortalAction,
  getBillingActionErrorResponse,
  getBillingCycle,
  getIdempotencyKey,
  getPauseResumeTimestamp,
  getPendingPlanSyncResponse,
  getPortalFlowData,
  getSeatCheckoutMetadata,
  getSeatCheckoutUrls,
  getSeatQuantity,
  getTargetPlanId,
  isMembershipItem,
  isSubscriptionMutation,
  parseActionBody,
  type BillingAction,
  type BillingActionBody,
  type ManageableBillingFields,
} from "./portal-route-support";

export const runtime = "nodejs";

type BillingSummary = NonNullable<Awaited<ReturnType<typeof getBillingSummary>>>;
type ManageableBilling = BillingSummary & ManageableBillingFields;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = parseActionBody(await request.json().catch(() => ({})));
    const action = body.action ?? "manage";
    const billing = await getManageableBilling();
    const returnUrl = `${new URL(request.url).origin}/subscription`;

    return await handleBillingAction({ action, billing, body, returnUrl });
  } catch (error) {
    return getBillingActionErrorResponse(error);
  }
}

async function getManageableBilling(): Promise<ManageableBilling> {
  const billing = await getBillingSummary();

  if (!billing) {
    throw new BillingActionError("No organization subscription was found.", 404);
  }
  if (billing.role !== "owner" && billing.role !== "admin") {
    throw new BillingActionError(
      "Only organization administrators can manage billing.",
      403,
    );
  }
  if (!billing.customerId) {
    throw new BillingActionError(
      "Billing is not ready for this membership yet.",
      409,
    );
  }
  if (!billing.subscriptionId) {
    throw new BillingActionError(
      "Subscription billing is not ready for this membership yet.",
      409,
    );
  }

  return billing as ManageableBilling;
}

async function handleBillingAction({
  action,
  billing,
  body,
  returnUrl,
}: {
  action: BillingAction;
  billing: ManageableBilling;
  body: BillingActionBody;
  returnUrl: string;
}) {
  if (action === "add_seat") {
    return handleAddSeatAction({ billing, body, returnUrl });
  }
  if (isSubscriptionMutation(action)) {
    return handleSubscriptionMutation({ action, billing, body });
  }

  assertSupportedPortalAction(action);
  return createPortalSessionResponse({ action, billing, returnUrl });
}

async function handleAddSeatAction({
  billing,
  body,
  returnUrl,
}: {
  billing: ManageableBilling;
  body: BillingActionBody;
  returnUrl: string;
}) {
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

async function handleSubscriptionMutation({
  action,
  billing,
  body,
}: {
  action: "pause" | "resume" | "change_plan";
  billing: ManageableBilling;
  body: BillingActionBody;
}) {
  validateSubscriptionMutation({ action, billing, body });
  const subscription = await runSubscriptionMutation({ action, billing, body });
  const syncResponse = await syncBillingMutation({ action, subscription });

  return (
    syncResponse ??
    NextResponse.json({
      ok: true,
      ...(action === "change_plan" ? { planId: body.targetPlanId } : {}),
    })
  );
}

function validateSubscriptionMutation({
  action,
  billing,
  body,
}: {
  action: "pause" | "resume" | "change_plan";
  billing: ManageableBilling;
  body: BillingActionBody;
}) {
  if (action !== "change_plan") {
    assertPauseTransition(action, billing.status);
    return;
  }

  assertSeatAdjustmentAllowed(billing.status);
  const targetPlanId = getTargetPlanId(body.targetPlanId);
  assertPlanUpgradeAllowed(
    billing.planId,
    targetPlanId,
    billing.cancelAtPeriodEnd,
  );
}

async function runSubscriptionMutation({
  action,
  billing,
  body,
}: {
  action: "pause" | "resume" | "change_plan";
  billing: ManageableBilling;
  body: BillingActionBody;
}) {
  if (action === "pause") return pauseSubscription(billing.subscriptionId, body);
  if (action === "resume") return resumeSubscription(billing.subscriptionId);

  return changePlanSubscription({
    billingInterval: billing.billingInterval,
    idempotencyKey: getIdempotencyKey(body.idempotencyKey),
    subscriptionId: billing.subscriptionId,
    targetPlanId: getTargetPlanId(body.targetPlanId),
  });
}

async function syncBillingMutation({
  action,
  subscription,
}: {
  action: BillingAction;
  subscription: { id: string };
}) {
  try {
    await syncStripeSubscription(
      createAdminClient(),
      await retrieveSubscriptionForSync(subscription.id),
    );
  } catch (syncError) {
    logError("Stripe billing action succeeded but local sync failed", syncError, {
      action,
      subscriptionId: subscription.id,
    });
    if (action === "change_plan") return getPendingPlanSyncResponse();
  }

  return null;
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
  const metadata = getSeatCheckoutMetadata({
    localSubscriptionId,
    organizationId,
    quantity,
  });
  const urls = getSeatCheckoutUrls({ quantity, returnUrl });

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: customerId,
      client_reference_id: localSubscriptionId,
      line_items: [{ price: getStripeSeatPriceId(), quantity }],
      billing_address_collection: "required",
      metadata,
      payment_intent_data: { metadata },
      ...urls,
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

function pauseSubscription(subscriptionId: string, body: BillingActionBody) {
  return getStripe().subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: "void",
      resumes_at: getPauseResumeTimestamp(body.pauseDays ?? 30),
    },
  });
}

function resumeSubscription(subscriptionId: string) {
  return getStripe().subscriptions.update(subscriptionId, {
    pause_collection: "",
  });
}

function retrieveSubscriptionForSync(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

async function createPortalSessionResponse({
  action,
  billing,
  returnUrl,
}: {
  action: BillingAction;
  billing: ManageableBilling;
  returnUrl: string;
}) {
  const session = await getStripe().billingPortal.sessions.create({
    configuration: await getBillingPortalConfigurationId(),
    customer: billing.customerId,
    flow_data: getPortalFlowData(action, billing.subscriptionId, returnUrl),
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
