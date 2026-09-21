import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("server-side founding-member validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps the secret code hash to the configured Stripe coupon", async () => {
    vi.stubEnv(
      "FOUNDING_MEMBER_CODE_SHA256",
      createHash("sha256").update("FOUNDING-TEST-CODE").digest("hex"),
    );
    vi.stubEnv("STRIPE_FOUNDING_COUPON_ID", "olea_founding_15_year_1");
    const { validateFoundingMemberCode } = await import(
      "@/lib/stripe/founding-member"
    );

    expect(validateFoundingMemberCode(" founding-test-code ")).toBe(
      "olea_founding_15_year_1",
    );
    expect(validateFoundingMemberCode("")).toBeNull();
  });

  it("rejects a different well-formed code without exposing the expected value", async () => {
    vi.stubEnv(
      "FOUNDING_MEMBER_CODE_SHA256",
      createHash("sha256").update("FOUNDING-TEST-CODE").digest("hex"),
    );
    vi.stubEnv("STRIPE_FOUNDING_COUPON_ID", "olea_founding_15_year_1");
    const { validateFoundingMemberCode } = await import(
      "@/lib/stripe/founding-member"
    );

    expect(() => validateFoundingMemberCode("OLEAFOUNDING10")).toThrow(
      "That founding-member code is invalid or expired.",
    );
  });

  it("accepts only the intended 15% 12-month Stripe coupon with a 50-use cap", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_ID", "founding_coupon");
    const { assertFoundingCouponConfiguration } = await import(
      "@/lib/stripe/founding-member"
    );
    const retrieve = vi.fn().mockResolvedValue({
      deleted: false,
      duration: "repeating",
      duration_in_months: 12,
      id: "founding_coupon",
      max_redemptions: 50,
      percent_off: 15,
      valid: true,
    });

    await expect(
      assertFoundingCouponConfiguration({
        coupons: { retrieve },
      } as never),
    ).resolves.toBe("founding_coupon");
  });

  it("rejects a misconfigured Stripe coupon", async () => {
    vi.stubEnv("STRIPE_FOUNDING_COUPON_ID", "wrong_coupon");
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
            max_redemptions: null,
            percent_off: 20,
            valid: true,
          }),
        },
      } as never),
    ).rejects.toThrow("Stripe founding-member coupon is misconfigured");
  });
});
