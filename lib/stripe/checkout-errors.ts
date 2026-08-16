import { SignupValidationError } from "@/lib/signup-flow";

export const CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE =
  "Verification emails are temporarily limited. Please wait a few minutes and try again.";
export const CHECKOUT_ACCOUNT_STATE_MESSAGE =
  "Unable to continue with these account details. Sign in or reset your password, then try again.";

export class CheckoutAccountStateError extends Error {
  constructor(message = CHECKOUT_ACCOUNT_STATE_MESSAGE) {
    super(message);
    this.name = "CheckoutAccountStateError";
  }
}

export class CheckoutRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutRateLimitError";
  }
}

export function getCheckoutErrorResponse(error: unknown) {
  if (error instanceof SignupValidationError) {
    return { error: error.message, status: 400 };
  }

  if (error instanceof CheckoutAccountStateError) {
    return { error: error.message, status: 409 };
  }

  if (error instanceof CheckoutRateLimitError) {
    return { error: error.message, status: 429 };
  }

  return null;
}
