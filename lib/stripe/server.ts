import "server-only";

import Stripe from "stripe";

import type { MembershipTier, RegistrationState } from "@/lib/types";

type BillingCycle = RegistrationState["billingCycle"];

let stripeClient: Stripe | undefined;
let portalConfigurationId: string | undefined;

const membershipTiers: MembershipTier[] = [
  "seedling",
  "roots",
  "canopy",
  "harvest",
];
const billingCycles: BillingCycle[] = ["monthly", "annual"];

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

export function getStripeSeatPriceId() {
  const priceId = process.env.STRIPE_PRICE_SEAT_MONTHLY;

  if (!priceId) {
    throw new Error("STRIPE_PRICE_SEAT_MONTHLY is not configured.");
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

async function getPortalUpdateProducts() {
  const stripe = getStripe();
  const seatPriceId = getStripeSeatPriceId();
  const priceIds = [
    ...membershipTiers.flatMap((tier) =>
      billingCycles.map((cycle) => getStripePriceId(tier, cycle)),
    ),
    seatPriceId,
  ];
  const prices = await Promise.all(
    priceIds.map((priceId) => stripe.prices.retrieve(priceId)),
  );
  const products = new Map<string, string[]>();

  prices.forEach((price) => {
    const productId =
      typeof price.product === "string" ? price.product : price.product.id;
    products.set(productId, [...(products.get(productId) ?? []), price.id]);
  });

  return [...products.entries()].map(([product, pricesForProduct]) => ({
    product,
    prices: pricesForProduct,
    ...(pricesForProduct.includes(seatPriceId)
      ? {
          adjustable_quantity: {
            enabled: true,
            minimum: 0,
            maximum: 100,
          },
        }
      : {}),
  }));
}

async function getBillingPortalConfigurationParams() {
  return {
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
      subscription_update: {
        default_allowed_updates: ["price", "quantity"],
        enabled: true,
        products: await getPortalUpdateProducts(),
        proration_behavior: "always_invoice",
        schedule_at_period_end: {
          conditions: [
            { type: "decreasing_item_amount" },
            { type: "shortening_interval" },
          ],
        },
      },
    },
    metadata: { olea_connects: "subscription_management" },
  } satisfies Stripe.BillingPortal.ConfigurationCreateParams;
}

export async function getBillingPortalConfigurationId() {
  if (portalConfigurationId) return portalConfigurationId;

  const configuredId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;

  const stripe = getStripe();
  const configurationParams = await getBillingPortalConfigurationParams();
  if (configuredId) {
    const configuration = await stripe.billingPortal.configurations.update(
      configuredId,
      configurationParams,
    );
    portalConfigurationId = configuration.id;
    return portalConfigurationId;
  }

  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 10,
  });
  const existing = configurations.data.find(
    (configuration) =>
      configuration.metadata?.olea_connects === "subscription_management" ||
      configuration.metadata?.olea_connects === "billing_recovery",
  );

  const configuration = existing
    ? await stripe.billingPortal.configurations.update(
        existing.id,
        configurationParams,
      )
    : await stripe.billingPortal.configurations.create(configurationParams);

  portalConfigurationId = configuration.id;
  return portalConfigurationId;
}
