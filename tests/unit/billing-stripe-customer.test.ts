import { describe, expect, it } from "vitest";

import { isMissingStripeCustomerError } from "@/lib/billing/stripe-customer";

describe("isMissingStripeCustomerError", () => {
  it("recognizes a missing customer in the current Stripe account", () => {
    expect(
      isMissingStripeCustomerError({
        code: "resource_missing",
        param: "customer",
      }),
    ).toBe(true);
  });

  it("does not hide unrelated Stripe failures", () => {
    expect(
      isMissingStripeCustomerError({
        code: "resource_missing",
        param: "subscription",
      }),
    ).toBe(false);
    expect(isMissingStripeCustomerError(new Error("Network unavailable"))).toBe(
      false,
    );
  });
});
