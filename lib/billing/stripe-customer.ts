export function isMissingStripeCustomerError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const stripeError = error as { code?: unknown; param?: unknown };
  return (
    stripeError.code === "resource_missing" && stripeError.param === "customer"
  );
}
