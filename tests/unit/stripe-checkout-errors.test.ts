import { describe, expect, it } from "vitest";

import {
  CHECKOUT_ACCOUNT_STATE_MESSAGE,
  CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE,
  CheckoutAccountStateError,
  CheckoutRateLimitError,
  getCheckoutErrorResponse,
} from "@/lib/stripe/checkout-errors";
import { SignupValidationError } from "@/lib/signup-flow";

describe("checkout error responses", () => {
  it("returns a retryable response for confirmation email rate limits", () => {
    const result = getCheckoutErrorResponse(
      new CheckoutRateLimitError(CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE),
    );

    expect(result).toEqual({
      code: "checkout_rate_limited",
      error: CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE,
      status: 429,
    });
  });

  it("returns a safe conflict for an existing-account state", () => {
    expect(getCheckoutErrorResponse(new CheckoutAccountStateError())).toEqual({
      code: "account_state",
      error: CHECKOUT_ACCOUNT_STATE_MESSAGE,
      status: 409,
    });
  });

  it("keeps validation failures as client errors", () => {
    expect(
      getCheckoutErrorResponse(new SignupValidationError("Select a plan.")),
    ).toEqual({
      code: "signup_validation",
      error: "Select a plan.",
      status: 400,
    });
  });

  it("does not expose unexpected provider errors", () => {
    expect(getCheckoutErrorResponse(new Error("Stripe internals"))).toBeNull();
  });
});
