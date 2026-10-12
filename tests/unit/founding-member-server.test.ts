import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("server-side founding-member validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates the secret code independently of the package-specific coupon", async () => {
    vi.stubEnv(
      "FOUNDING_MEMBER_CODE_SHA256",
      createHash("sha256").update("FOUNDING-TEST-CODE").digest("hex"),
    );
    const { validateFoundingMemberCode } = await import(
      "@/lib/stripe/founding-member"
    );

    expect(validateFoundingMemberCode(" founding-test-code ")).toBe(
      "FOUNDING-TEST-CODE",
    );
    expect(validateFoundingMemberCode("")).toBeNull();
  });

  it("rejects a different well-formed code without exposing the expected value", async () => {
    vi.stubEnv(
      "FOUNDING_MEMBER_CODE_SHA256",
      createHash("sha256").update("FOUNDING-TEST-CODE").digest("hex"),
    );
    const { validateFoundingMemberCode } = await import(
      "@/lib/stripe/founding-member"
    );

    expect(() => validateFoundingMemberCode("OLEAFOUNDING10")).toThrow(
      "That founding-member code is invalid or expired.",
    );
  });

  it("accepts only the exact package-specific fixed discount for 24 months", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_SEEDLING_ANNUAL", "founding_coupon");
    const { assertFoundingCouponConfiguration } = await import(
      "@/lib/stripe/founding-member"
    );
    const retrieve = vi.fn().mockResolvedValue({
      deleted: false,
      duration: "repeating",
      duration_in_months: 24,
      id: "founding_coupon",
      amount_off: 18000,
      currency: "cad",
      applies_to: { products: ["seedling_product"] },
      valid: true,
    });

    await expect(
      assertFoundingCouponConfiguration({
        coupons: { retrieve },
      } as never, "seedling", "annual", { product: "seedling_product" } as never),
    ).resolves.toBe("founding_coupon");
  });

  it("accepts a valid coupon when Stripe omits applies_to from its API response", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_SEEDLING_ANNUAL", "founding_coupon");
    const { assertFoundingCouponConfiguration } = await import(
      "@/lib/stripe/founding-member"
    );

    await expect(
      assertFoundingCouponConfiguration({
        coupons: {
          retrieve: vi.fn().mockResolvedValue({
            deleted: false,
            duration: "repeating",
            duration_in_months: 24,
            amount_off: 18000,
            currency: "cad",
            valid: true,
          }),
        },
      } as never, "seedling", "annual", { product: "seedling_product" } as never),
    ).resolves.toBe("founding_coupon");
  });

  it("rejects a coupon explicitly restricted to another product", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_SEEDLING_ANNUAL", "wrong_product");
    const { assertFoundingCouponConfiguration } = await import(
      "@/lib/stripe/founding-member"
    );

    await expect(
      assertFoundingCouponConfiguration({
        coupons: {
          retrieve: vi.fn().mockResolvedValue({
            deleted: false,
            duration: "repeating",
            duration_in_months: 24,
            amount_off: 18000,
            currency: "cad",
            applies_to: { products: ["other_product"] },
            valid: true,
          }),
        },
      } as never, "seedling", "annual", { product: "seedling_product" } as never),
    ).rejects.toThrow("Stripe founding-member coupon is misconfigured");
  });

  it("rejects the old 12-month coupon", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_SEEDLING_ANNUAL", "old_coupon");
    const { assertFoundingCouponConfiguration } = await import(
      "@/lib/stripe/founding-member"
    );

    await expect(
      assertFoundingCouponConfiguration({
        coupons: {
          retrieve: vi.fn().mockResolvedValue({
            deleted: false,
            duration: "repeating",
            duration_in_months: 12,
            id: "old_coupon",
            amount_off: 18000,
            currency: "cad",
            applies_to: { products: ["seedling_product"] },
            valid: true,
          }),
        },
      } as never, "seedling", "annual", { product: "seedling_product" } as never),
    ).rejects.toThrow("Stripe founding-member coupon is misconfigured");
  });

  it("rejects a misconfigured Stripe coupon", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_SEEDLING_ANNUAL", "wrong_coupon");
    const { assertFoundingCouponConfiguration } = await import(
      "@/lib/stripe/founding-member"
    );

    await expect(
      assertFoundingCouponConfiguration({
        coupons: {
          retrieve: vi.fn().mockResolvedValue({
            deleted: false,
            duration: "forever",
            id: "wrong_coupon",
            amount_off: 10000,
            currency: "cad",
            applies_to: { products: ["seedling_product"] },
            valid: true,
          }),
        },
      } as never, "seedling", "annual", { product: "seedling_product" } as never),
    ).rejects.toThrow("Stripe founding-member coupon is misconfigured");
  });
});
