export function resolveEmailRecipient(
  original: string,
  environment = process.env.EMAIL_ENVIRONMENT ?? "development",
  testRecipient = process.env.EMAIL_TEST_RECIPIENT,
) {
  if (environment === "production") return original;
  if (!testRecipient) {
    throw new Error("EMAIL_TEST_RECIPIENT is required outside production.");
  }
  return testRecipient;
}

export function hasClaimedEmailEvent<T extends { id: string | null }>(
  event: T | null,
): event is T & { id: string } {
  return Boolean(event?.id);
}
