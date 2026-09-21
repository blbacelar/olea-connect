import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { normalizeFoundingMemberCode } from "@/lib/founding-member";
import { FoundingMemberCodeError } from "@/lib/stripe/checkout-errors";
import type Stripe from "stripe";

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

  return getFoundingCouponId();
}

export function getFoundingCouponId() {
  const couponId = process.env.STRIPE_FOUNDING_COUPON_ID?.trim();
  if (!couponId) {
    throw new Error("The Stripe founding-member coupon is not configured.");
  }
  return couponId;
}

export async function assertFoundingCouponConfiguration(stripe: Stripe) {
  const couponId = getFoundingCouponId();
  const coupon = await stripe.coupons.retrieve(couponId);

  if (
    coupon.deleted ||
    !coupon.valid ||
    coupon.percent_off !== 15 ||
    coupon.duration !== "repeating" ||
    coupon.duration_in_months !== 12 ||
    coupon.max_redemptions !== 50
  ) {
    throw new Error("The Stripe founding-member coupon is misconfigured.");
  }

  return couponId;
}
