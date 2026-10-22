import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { normalizeFoundingMemberCode } from "@/lib/founding-member";
import { getFoundingPrice, isSignupTier } from "@/lib/founding-pricing";
import { FoundingMemberCodeError } from "@/lib/stripe/checkout-errors";
import { getStripePriceId } from "@/lib/stripe/server";
import type { RegistrationState } from "@/lib/types";
import type Stripe from "stripe";

type BillingCycle = RegistrationState["billingCycle"];

function getExpectedCodeHash() {
  const expectedHash = process.env.FOUNDING_MEMBER_CODE_SHA256?.trim();
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    throw new Error("The founding-member code is not configured.");
  }
  return Buffer.from(expectedHash, "hex");
}

export function validateFoundingMemberCode(code: string) {
  if (!code) return null;

  const normalized = normalizeFoundingMemberCode(code);
  if (!normalized) {
    throw new FoundingMemberCodeError();
  }

  const candidateHash = createHash("sha256").update(normalized).digest();
  if (!timingSafeEqual(candidateHash, getExpectedCodeHash())) {
    throw new FoundingMemberCodeError();
  }

  return normalized;
}

export function getFoundingCouponId(tier: string, cycle: BillingCycle) {
  if (!isSignupTier(tier)) {
    throw new Error("Unsupported founding-member package.");
  }
  const couponId = process.env[
    `STRIPE_FOUNDING_COUPON_${tier.toUpperCase()}_${cycle.toUpperCase()}`
  ]?.trim();
  if (!couponId) {
    throw new Error(`The Stripe founding-member coupon is not configured for ${tier} ${cycle}.`);
  }
  return couponId;
}

export async function assertCheckoutPriceConfiguration(
  stripe: Stripe,
  tier: string,
  cycle: BillingCycle,
) {
  if (!isSignupTier(tier)) throw new Error("Unsupported membership package.");
  const priceId = getStripePriceId(tier, cycle);
  const price = await stripe.prices.retrieve(priceId);
  const expected = getFoundingPrice(tier, cycle);
  if (
    !price.active ||
    price.currency !== "cad" ||
    price.unit_amount !== expected.standard * 100 ||
    price.recurring?.interval !== (cycle === "annual" ? "year" : "month") ||
    price.recurring.interval_count !== (cycle === "annual" ? 1 : 3)
  ) {
    throw new Error(`Stripe price is misconfigured for ${tier} ${cycle}.`);
  }
  return price;
}

export async function assertFoundingCouponConfiguration(
  stripe: Stripe,
  tier: string,
  cycle: BillingCycle,
  price?: Stripe.Price,
) {
  if (!isSignupTier(tier)) throw new Error("Unsupported founding-member package.");
  const couponId = getFoundingCouponId(tier, cycle);
  const targetPrice = price ?? await assertCheckoutPriceConfiguration(stripe, tier, cycle);
  const coupon = await stripe.coupons.retrieve(couponId);
  const productId = typeof targetPrice.product === "string"
    ? targetPrice.product
    : targetPrice.product.id;
  const expected = getFoundingPrice(tier, cycle);

  if (
    coupon.deleted ||
    !coupon.valid ||
    coupon.currency !== "cad" ||
    coupon.amount_off !== (expected.standard - expected.founding) * 100 ||
    coupon.duration !== "repeating" ||
    coupon.duration_in_months !== 24 ||
    (coupon.applies_to && !coupon.applies_to.products.includes(productId))
  ) {
    throw new Error("The Stripe founding-member coupon is misconfigured.");
  }

  return couponId;
}
