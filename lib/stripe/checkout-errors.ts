import { SignupValidationError } from "@/lib/signup-flow";

export const CHECKOUT_EMAIL_RATE_LIMIT_MESSAGE =
  "Verification emails are temporarily limited. Please wait a few minutes and try again.";

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

  if (error instanceof CheckoutRateLimitError) {
    return { error: error.message, status: 429 };
  }

  return null;
}
