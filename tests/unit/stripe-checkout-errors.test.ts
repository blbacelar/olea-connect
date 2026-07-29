import { describe, expect, it } from "vitest";

import {
  CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE,
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
      error: CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE,
      status: 429,
    });
  });

  it("keeps validation failures as client errors", () => {
    expect(
      getCheckoutErrorResponse(new SignupValidationError("Select a plan.")),
    ).toEqual({ error: "Select a plan.", status: 400 });
  });

  it("does not expose unexpected provider errors", () => {
    expect(getCheckoutErrorResponse(new Error("Stripe internals"))).toBeNull();
  });
});
