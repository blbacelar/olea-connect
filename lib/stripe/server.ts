import "server-only";

import Stripe from "stripe";

import type { MembershipTier, RegistrationState } from "@/lib/types";

type BillingCycle = RegistrationState["billingCycle"];

let stripeClient: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getStripePriceId(
  tier: MembershipTier,
  billingCycle: BillingCycle,
) {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`;
  const priceId = process.env[key];

  if (!priceId) {
    throw new Error(`Stripe price is not configured for ${tier} ${billingCycle}.`);
  }

  return priceId;
}

export function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return webhookSecret;
}

export async function getBillingPortalConfigurationId() {
  const configuredId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  if (configuredId) return configuredId;

  const stripe = getStripe();
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 10,
  });
  const existing = configurations.data.find(
    (configuration) =>
      configuration.metadata?.olea_connects === "billing_recovery",
  );

  if (existing) return existing.id;

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your Olea Connects membership and payment details.",
    },
    features: {
      customer_update: {
        allowed_updates: ["address", "email", "name"],
        enabled: true,
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        cancellation_reason: {
          enabled: true,
          options: [
            "customer_service",
            "low_quality",
            "missing_features",
            "other",
            "switched_service",
            "too_complex",
            "too_expensive",
            "unused",
          ],
        },
        enabled: true,
        mode: "at_period_end",
      },
    },
    metadata: { olea_connects: "billing_recovery" },
  });

  return configuration.id;
}
