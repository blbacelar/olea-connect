import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getStripe } from "@/lib/stripe/server";
import { recordStripeSubscription } from "@/lib/stripe/subscription-recording";
import { syncStripeSubscription } from "@/lib/stripe/subscriptions";

export { recordStripeSubscription };

export interface ProvisioningResult {
  status:
    | "not_found"
    | "pending_verification"
    | "pending_payment"
    | "completed"
    | "failed";
  request_id: string;
  organization_id?: string;
  subscription_id?: string;
  error?: string;
}

export async function attachCheckoutSession(
  supabase: SupabaseClient,
  requestId: string,
  checkoutSessionId: string,
) {
  const { error } = await supabase
    .from("workspace_provisioning_requests")
    .update({ checkout_session_id: checkoutSessionId })
    .eq("id", requestId);

  if (error) throw error;
}

async function retrieveCheckoutSubscription(checkoutSessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

  const subscriptionRef = session.subscription;
  if (!subscriptionRef) {
    throw new Error("Checkout session does not have a subscription.");
  }

  if (typeof subscriptionRef !== "string") {
    return { session, subscription: subscriptionRef };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionRef);
  return { session, subscription };
}

function getCheckoutProvisioningRequestId(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
) {
  const requestId =
    session.metadata?.provisioning_request_id ??
    subscription.metadata.provisioning_request_id;

  if (!requestId) {
    throw new Error("Checkout session is missing provisioning metadata.");
  }

  return requestId;
}

function assertMatchingCheckoutSession(
  checkoutSessionId: string,
  request: { checkout_session_id: string | null },
) {
  if (
    request.checkout_session_id &&
    request.checkout_session_id !== checkoutSessionId
  ) {
    throw new Error("Checkout session does not match this activation record.");
  }
}

function buildCheckoutSubscriptionMetadata(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
  requestId: string,
) {
  return {
    ...subscription.metadata,
    provisioning_request_id: requestId,
    ...(session.metadata?.user_id ? { user_id: session.metadata.user_id } : {}),
    ...(session.metadata?.plan_id ? { plan_id: session.metadata.plan_id } : {}),
    ...(session.metadata?.billing_cycle
      ? { billing_cycle: session.metadata.billing_cycle }
      : {}),
  };
}

async function ensureCheckoutSubscriptionMetadata(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
  requestId: string,
) {
  if (subscription.metadata.provisioning_request_id === requestId) {
    return subscription;
  }

  return stripe.subscriptions.update(subscription.id, {
    metadata: buildCheckoutSubscriptionMetadata(session, subscription, requestId),
  });
}

export async function recoverCheckoutSessionProvisioning(
  supabase: SupabaseClient,
  checkoutSessionId: string,
) {
  const stripe = getStripe();
  const { session, subscription } =
    await retrieveCheckoutSubscription(checkoutSessionId);
  const requestId = getCheckoutProvisioningRequestId(session, subscription);

  const { data: request, error: requestError } = await supabase
    .from("workspace_provisioning_requests")
    .select("id, checkout_session_id")
    .eq("id", requestId)
    .single();

  if (requestError) throw requestError;
  assertMatchingCheckoutSession(checkoutSessionId, request);

  if (!request.checkout_session_id) {
    await attachCheckoutSession(supabase, requestId, checkoutSessionId);
  }

  const subscriptionWithMetadata = await ensureCheckoutSubscriptionMetadata(
    stripe,
    session,
    subscription,
    requestId,
  );

  await recordStripeSubscription(supabase, subscriptionWithMetadata);
  return attemptWorkspaceProvisioning(
    supabase,
    requestId,
    subscriptionWithMetadata,
  );
}

async function recordCompletedReferral(
  supabase: SupabaseClient,
  requestId: string,
  organizationId: string,
) {
  const { data: partnerReferral, error: partnerReferralError } =
    await supabase.rpc("record_partner_signup_referral", {
      target_request_id: requestId,
      target_organization_id: organizationId,
    });
  if (partnerReferralError) throw partnerReferralError;

  const partnerReferralResult = partnerReferral as { status?: string } | null;
  if (partnerReferralResult?.status && partnerReferralResult.status !== "none") {
    return;
  }

  const { error: referralError } = await supabase.rpc(
    "finalize_signup_referral",
    {
      target_request_id: requestId,
      target_organization_id: organizationId,
    },
  );
  if (referralError) throw referralError;
}

async function markFoundingMemberPaid(
  supabase: SupabaseClient,
  requestId: string,
  organizationId: string,
) {
  const { error } = await supabase.rpc("mark_founding_member_paid", {
    target_request_id: requestId,
    target_organization_id: organizationId,
  });
  if (error) throw error;
}

async function applyCompletedProvisioningSideEffects(
  supabase: SupabaseClient,
  requestId: string,
  result: ProvisioningResult,
) {
  if (result.status !== "completed" || !result.organization_id) return;
  await recordCompletedReferral(supabase, requestId, result.organization_id);
  await markFoundingMemberPaid(supabase, requestId, result.organization_id);
}

function hasCurrentSubscriptionMetadata(
  subscription: Stripe.Subscription,
  requestId: string,
  result: ProvisioningResult,
) {
  return (
    subscription.metadata.provisioning_request_id === requestId &&
    subscription.metadata.local_subscription_id === result.subscription_id &&
    subscription.metadata.organization_id === result.organization_id
  );
}

async function syncCompletedSubscription(
  supabase: SupabaseClient,
  requestId: string,
  result: ProvisioningResult,
  stripeSubscription?: Stripe.Subscription,
) {
  if (result.status !== "completed") return;

  const { data: request, error: requestError } = await supabase
    .from("workspace_provisioning_requests")
    .select("provider_subscription_id")
    .eq("id", requestId)
    .single();

  if (requestError) throw requestError;
  if (!request.provider_subscription_id) return;

  let subscription =
    stripeSubscription ??
    (await getStripe().subscriptions.retrieve(request.provider_subscription_id));

  if (!hasCurrentSubscriptionMetadata(subscription, requestId, result)) {
    subscription = await getStripe().subscriptions.update(
      request.provider_subscription_id,
      {
        metadata: {
          ...subscription.metadata,
          provisioning_request_id: requestId,
          local_subscription_id: result.subscription_id ?? "",
          organization_id: result.organization_id ?? "",
        },
      },
    );
  }

  await syncStripeSubscription(supabase, subscription);
}

export async function attemptWorkspaceProvisioning(
  supabase: SupabaseClient,
  requestId: string,
  stripeSubscription?: Stripe.Subscription,
) {
  const { data, error } = await supabase.rpc(
    "attempt_workspace_provisioning",
    { target_request_id: requestId },
  );

  if (error) throw error;
  const result = data as ProvisioningResult;

  await applyCompletedProvisioningSideEffects(supabase, requestId, result);
  await syncCompletedSubscription(
    supabase,
    requestId,
    result,
    stripeSubscription,
  );

  return result;
}

export async function attemptUserWorkspaceProvisioning(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("workspace_provisioning_requests")
    .select("id, checkout_session_id")
    .eq("user_id", userId)
    .in("status", ["pending_verification", "pending_payment", "failed"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const result = await attemptWorkspaceProvisioning(supabase, data.id);
  if (result.status === "pending_payment" && data.checkout_session_id) {
    return recoverCheckoutSessionProvisioning(
      supabase,
      data.checkout_session_id,
    );
  }

  return result;
}
