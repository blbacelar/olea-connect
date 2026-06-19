import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";
import { getStripe } from "@/lib/stripe/server";
import { syncStripeSubscription } from "@/lib/stripe/subscriptions";
import type { MembershipTier, RegistrationState } from "@/lib/types";

type BillingCycle = RegistrationState["billingCycle"];
const tiers: MembershipTier[] = ["seedling", "roots", "canopy", "harvest"];

interface CheckoutRegistration {
  userId: string;
  email: string;
  fullName: string;
  organizationName: string;
  province: string;
  tier: MembershipTier;
  billingCycle: BillingCycle;
}

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

export interface ProvisioningReconciliationSummary {
  checked: number;
  completed: number;
  pending: number;
  failed: number;
  errors: Array<{
    requestId: string;
    message: string;
  }>;
}

export async function prepareCheckoutRegistration(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
) {
  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(registration.userId);

  if (authError || !authUser.user) {
    throw new Error("The signup account could not be verified.");
  }

  if (
    authUser.user.email?.toLowerCase() !== registration.email.toLowerCase()
  ) {
    throw new Error("The checkout email does not match the signup account.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("workspace_provisioning_requests")
    .select("id, status")
    .eq("user_id", registration.userId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing?.status === "completed") {
    throw new Error("This account already has an active workspace.");
  }

  const values = {
    user_id: registration.userId,
    email: registration.email.trim().toLowerCase(),
    full_name: registration.fullName.trim(),
    organization_name: registration.organizationName.trim(),
    province_or_region: registration.province,
    plan_id: registration.tier,
    billing_interval:
      registration.billingCycle === "annual" ? "year" : "month",
    status: authUser.user.email_confirmed_at
      ? "pending_payment"
      : "pending_verification",
    last_error: null,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("workspace_provisioning_requests")
      .update(values)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) throw error;
    return { requestId: data.id as string };
  }

  const { data, error } = await supabase
    .from("workspace_provisioning_requests")
    .insert(values)
    .select("id")
    .single();

  if (error) throw error;
  return { requestId: data.id as string };
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

export async function recordStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const requestId = subscription.metadata.provisioning_request_id;
  if (!requestId) return null;

  const firstItem = subscription.items.data[0];
  const status = mapSubscriptionStatus(subscription);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const planId = tiers.includes(
    subscription.metadata.plan_id as MembershipTier,
  )
    ? (subscription.metadata.plan_id as MembershipTier)
    : undefined;
  const billingInterval =
    firstItem?.price.recurring?.interval === "year" ? "year" : "month";

  const { data, error } = await supabase
    .from("workspace_provisioning_requests")
    .update({
      ...(planId ? { plan_id: planId } : {}),
      billing_interval: billingInterval,
      provider_customer_id: customerId,
      provider_subscription_id: subscription.id,
      provider_status: status,
      quantity: firstItem?.quantity ?? 1,
      current_period_start: toIsoDate(firstItem?.current_period_start),
      current_period_end: toIsoDate(firstItem?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: toIsoDate(subscription.canceled_at),
      stripe_snapshot: subscription,
      payment_confirmed_at:
        status === "active" || status === "trialing"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", requestId)
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
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

export async function recoverCheckoutSessionProvisioning(
  supabase: SupabaseClient,
  checkoutSessionId: string,
) {
  const stripe = getStripe();
  const { session, subscription } =
    await retrieveCheckoutSubscription(checkoutSessionId);
  const requestId =
    session.metadata?.provisioning_request_id ??
    subscription.metadata.provisioning_request_id;

  if (!requestId) {
    throw new Error("Checkout session is missing provisioning metadata.");
  }

  const { data: request, error: requestError } = await supabase
    .from("workspace_provisioning_requests")
    .select("id, checkout_session_id")
    .eq("id", requestId)
    .single();

  if (requestError) throw requestError;
  if (
    request.checkout_session_id &&
    request.checkout_session_id !== checkoutSessionId
  ) {
    throw new Error("Checkout session does not match this activation record.");
  }

  if (!request.checkout_session_id) {
    await attachCheckoutSession(supabase, requestId, checkoutSessionId);
  }

  const subscriptionWithMetadata =
    subscription.metadata.provisioning_request_id === requestId
      ? subscription
      : await stripe.subscriptions.update(subscription.id, {
          metadata: {
            ...subscription.metadata,
            provisioning_request_id: requestId,
            ...(session.metadata?.user_id
              ? { user_id: session.metadata.user_id }
              : {}),
            ...(session.metadata?.plan_id
              ? { plan_id: session.metadata.plan_id }
              : {}),
            ...(session.metadata?.billing_cycle
              ? { billing_cycle: session.metadata.billing_cycle }
              : {}),
          },
        });

  await recordStripeSubscription(supabase, subscriptionWithMetadata);
  return attemptWorkspaceProvisioning(
    supabase,
    requestId,
    subscriptionWithMetadata,
  );
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

  if (result.status === "completed") {
    const { data: request, error: requestError } = await supabase
      .from("workspace_provisioning_requests")
      .select("provider_subscription_id")
      .eq("id", requestId)
      .single();

    if (requestError) throw requestError;
    if (request.provider_subscription_id) {
      let subscription =
        stripeSubscription ??
        (await getStripe().subscriptions.retrieve(
          request.provider_subscription_id,
        ));
      const metadataIsCurrent =
        subscription.metadata.provisioning_request_id === requestId &&
        subscription.metadata.local_subscription_id ===
          result.subscription_id &&
        subscription.metadata.organization_id === result.organization_id;

      if (!metadataIsCurrent) {
        subscription = await getStripe().subscriptions.update(
          request.provider_subscription_id,
          {
            metadata: {
              provisioning_request_id: requestId,
              local_subscription_id: result.subscription_id ?? "",
              organization_id: result.organization_id ?? "",
            },
          },
        );
      }
      await syncStripeSubscription(supabase, subscription);
    }
  }

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

export async function reconcilePendingCheckoutProvisioning(
  supabase: SupabaseClient,
  {
    limit = 10,
    staleAfterMinutes = 2,
  }: { limit?: number; staleAfterMinutes?: number } = {},
): Promise<ProvisioningReconciliationSummary> {
  const staleBefore = new Date(
    Date.now() - staleAfterMinutes * 60 * 1000,
  ).toISOString();
  const { data: requests, error } = await supabase
    .from("workspace_provisioning_requests")
    .select("id, checkout_session_id")
    .eq("status", "pending_payment")
    .not("checkout_session_id", "is", null)
    .lte("updated_at", staleBefore)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const summary: ProvisioningReconciliationSummary = {
    checked: requests?.length ?? 0,
    completed: 0,
    pending: 0,
    failed: 0,
    errors: [],
  };

  for (const request of requests ?? []) {
    if (!request.checkout_session_id) continue;

    try {
      const result = await recoverCheckoutSessionProvisioning(
        supabase,
        request.checkout_session_id,
      );

      if (result.status === "completed") {
        summary.completed += 1;
      } else if (
        result.status === "pending_payment" ||
        result.status === "pending_verification"
      ) {
        summary.pending += 1;
      } else {
        summary.failed += 1;
        summary.errors.push({
          requestId: request.id,
          message: result.error ?? `Provisioning ended as ${result.status}.`,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown reconciliation error";
      summary.failed += 1;
      summary.errors.push({ requestId: request.id, message });
      await supabase
        .from("workspace_provisioning_requests")
        .update({ last_error: message })
        .eq("id", request.id);
    }
  }

  return summary;
}
