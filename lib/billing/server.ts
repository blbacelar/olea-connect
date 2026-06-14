import "server-only";

import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/utils/supabase/server";

export type BillingStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "unpaid";

export interface BillingSummary {
  organizationId: string;
  organizationName: string;
  role: "owner" | "admin" | "member";
  planId: string;
  planName: string;
  billingInterval: "month" | "year";
  status: BillingStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  amountCents: number;
  currency: string;
  paymentMethod: string | null;
  invoices: Array<{
    id: string;
    createdAt: string;
    amountCents: number;
    currency: string;
    status: string | null;
    hostedUrl: string | null;
    pdfUrl: string | null;
  }>;
}

function getPaymentMethodLabel(paymentMethod: Stripe.PaymentMethod | null) {
  if (!paymentMethod) return null;
  if (paymentMethod.card) {
    return `${paymentMethod.card.brand.toUpperCase()} ending ${paymentMethod.card.last4}`;
  }
  return paymentMethod.type.replaceAll("_", " ");
}

export async function getBillingSummary(): Promise<BillingSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, provider_customer_id, provider_subscription_id, billing_interval, status, current_period_end, cancel_at_period_end, membership_plans(name, monthly_price_cents, annual_price_cents, currency)",
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (!subscription) return null;

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  const plan = Array.isArray(subscription.membership_plans)
    ? subscription.membership_plans[0]
    : subscription.membership_plans;
  const amountCents =
    subscription.billing_interval === "year"
      ? (plan?.annual_price_cents ?? 0)
      : (plan?.monthly_price_cents ?? 0);

  let paymentMethod: Stripe.PaymentMethod | null = null;
  let invoices: BillingSummary["invoices"] = [];

  if (subscription.provider_customer_id) {
    const stripe = getStripe();
    const [methods, invoiceList] = await Promise.all([
      stripe.paymentMethods.list({
        customer: subscription.provider_customer_id,
        type: "card",
        limit: 1,
      }),
      stripe.invoices.list({
        customer: subscription.provider_customer_id,
        limit: 12,
      }),
    ]);

    paymentMethod = methods.data[0] ?? null;
    invoices = invoiceList.data.map((invoice) => ({
      id: invoice.id,
      createdAt: new Date(invoice.created * 1000).toISOString(),
      amountCents: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    }));
  }

  return {
    organizationId: membership.organization_id,
    organizationName: organization?.name ?? "Your organization",
    role: membership.role,
    planId: subscription.plan_id,
    planName: plan?.name ?? subscription.plan_id,
    billingInterval: subscription.billing_interval,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    customerId: subscription.provider_customer_id,
    subscriptionId: subscription.provider_subscription_id,
    amountCents,
    currency: plan?.currency ?? "CAD",
    paymentMethod: getPaymentMethodLabel(paymentMethod),
    invoices,
  };
}
