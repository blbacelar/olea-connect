export type SubscriptionAccess = {
  status: string;
  provider: string;
  current_period_end: string | null;
  metadata: unknown;
};

export function hasCurrentSubscriptionAccess(
  subscription: SubscriptionAccess | null | undefined,
  now = new Date(),
) {
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return false;
  }

  const metadata = subscription.metadata;
  const sponsoredManual = subscription.provider === "manual" &&
    metadata !== null && typeof metadata === "object" && !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).funding_source === "sponsorship";
  if (!sponsoredManual) return true;

  // The cron updates status daily; this check closes the gap at the exact end.
  const end = Date.parse(subscription.current_period_end ?? "");
  return Number.isFinite(end) && end > now.getTime();
}
