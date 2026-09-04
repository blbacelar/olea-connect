import {
  getBillingActivationRecovery,
  getBillingSummary,
} from "@/lib/billing/server";

import { SubscriptionDashboard } from "./subscription-dashboard";
import { SubscriptionEmptyState } from "./subscription-empty-state";

type SubscriptionPageProps = {
  searchParams?: {
    quantity?: string;
    plan?: string;
    seat?: string;
    tier?: string;
  };
};

export default async function SubscriptionPage({
  searchParams,
}: SubscriptionPageProps) {
  const billing = await getBillingSummary();

  if (!billing) {
    const activation = await getBillingActivationRecovery();
    return <SubscriptionEmptyState activation={activation} />;
  }

  return (
    <SubscriptionDashboard billing={billing} searchParams={searchParams} />
  );
}
