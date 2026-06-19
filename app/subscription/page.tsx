import { AlertTriangle, CheckCircle2, Clock3, Download, Sprout } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { ActivationRetryButton } from "@/components/auth/ActivationRetryButton";
import { Badge } from "@/components/ui/badge";
import {
  getBillingActivationRecovery,
  getBillingSummary,
  type BillingStatus,
} from "@/lib/billing/server";

import { BillingPortalButton } from "./billing-actions";

const statusLabels: Record<BillingStatus, string> = {
  incomplete: "Checkout incomplete",
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  canceled: "Canceled",
  unpaid: "Unpaid",
};

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function SubscriptionPage() {
  const billing = await getBillingSummary();

  if (!billing) {
    const activation = await getBillingActivationRecovery();

    return (
      <div>
        <PageHeader
          title="Subscription"
          description="Manage your membership and billing."
        />
        <section className="rounded-[14px] border bg-white p-8 shadow-soft">
          {activation ? (
            <>
              <Clock3 className="size-8 text-amber-600" />
              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Membership activation is still syncing
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                We found your signup activation record, but the membership has
                not finished attaching to this workspace yet. Do not start a new
                checkout. Retry activation below, or contact support if it keeps
                failing.
              </p>
              <dl className="mt-5 grid max-w-xl gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Signed-in account
                  </dt>
                  <dd className="mt-1 break-all font-semibold text-slate-700">
                    {activation.email || "Unknown"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Activation status
                  </dt>
                  <dd className="mt-1 font-semibold capitalize text-slate-700">
                    {activation.status.replaceAll("_", " ")}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Selected plan
                  </dt>
                  <dd className="mt-1 font-semibold capitalize text-slate-700">
                    {activation.planId}
                  </dd>
                </div>
              </dl>
              {activation.lastError ? (
                <p className="mt-4 max-w-xl rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {activation.lastError}
                </p>
              ) : null}
              <div className="max-w-xs">
                <ActivationRetryButton />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Need help? Email{" "}
                <a
                  href="mailto:hello@olivesocialimpact.com"
                  className="font-semibold text-olea-green"
                >
                  hello@olivesocialimpact.com
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="size-8 text-amber-600" />
              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Billing setup is incomplete
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                We could not find a membership or activation record for your
                organization. If you already paid, contact support before
                starting another checkout.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="mailto:hello@olivesocialimpact.com"
                  className="inline-flex h-10 items-center rounded-md bg-olea-green px-4 text-sm font-semibold text-white"
                >
                  Contact support
                </a>
                <a
                  href="/signup"
                  className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-slate-700"
                >
                  Choose a plan
                </a>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  const canManage = billing.role === "owner" || billing.role === "admin";
  const accessRestricted = !["active", "trialing"].includes(billing.status);

  return (
    <div>
      <PageHeader
        title="Subscription"
        description={`Manage billing for ${billing.organizationName}.`}
        action={
          canManage ? (
            <BillingPortalButton disabled={!billing.customerId} />
          ) : null
        }
      />

      {accessRestricted ? (
        <section className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Your membership needs attention</p>
            <p className="mt-1 text-sm leading-6">
              Platform access is limited while the subscription is{" "}
              {statusLabels[billing.status].toLowerCase()}. An organization
              owner or administrator can resolve this through Stripe.
            </p>
          </div>
        </section>
      ) : (
        <section className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm font-semibold">
            Your membership is active and platform access is enabled.
          </p>
        </section>
      )}

      <section className="mb-7 rounded-[14px] border bg-white p-[26px] shadow-soft">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              Current plan
            </p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold capitalize">
              <Sprout className="size-5 text-olea-green" />
              {billing.planName}
            </p>
            <p className="mt-1 text-[13.5px] text-slate-500">
              {formatMoney(billing.amountCents, billing.currency)} /{" "}
              {billing.billingInterval}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              Status
            </p>
            <Badge
              variant="outline"
              className={
                accessRestricted
                  ? "mt-2 border-amber-300 bg-amber-50 text-amber-800"
                  : "mt-2 border-emerald-300 bg-emerald-50 text-emerald-800"
              }
            >
              {statusLabels[billing.status]}
            </Badge>
            {billing.cancelAtPeriodEnd ? (
              <p className="mt-2 text-xs text-amber-700">
                Cancels at the end of the current billing period.
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              {billing.cancelAtPeriodEnd ? "Access ends" : "Next billing date"}
            </p>
            <p className="mt-2 text-base font-semibold">
              {billing.currentPeriodEnd
                ? formatDate(billing.currentPeriodEnd)
                : "Pending Stripe confirmation"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {billing.paymentMethod ?? "Payment method not available"}
            </p>
          </div>
        </div>
      </section>

      <h2 className="mb-3 text-base font-bold text-slate-800">
        Billing history
      </h2>
      <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
        <div className="hidden grid-cols-[1fr_1fr_120px_100px] bg-slate-50 px-[22px] py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid">
          <span>Date</span>
          <span>Status</span>
          <span>Amount</span>
          <span className="text-right">Invoice</span>
        </div>
        {billing.invoices.length ? (
          billing.invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="grid gap-2 border-t border-slate-100 px-[22px] py-[15px] text-sm first:border-t-0 md:grid-cols-[1fr_1fr_120px_100px] md:items-center"
            >
              <span>{formatDate(invoice.createdAt)}</span>
              <span className="capitalize text-slate-500">
                {invoice.status ?? "pending"}
              </span>
              <span className="font-mono">
                {formatMoney(invoice.amountCents, invoice.currency)}
              </span>
              {invoice.hostedUrl || invoice.pdfUrl ? (
                <a
                  href={invoice.hostedUrl ?? invoice.pdfUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-olea-green md:justify-end"
                >
                  <Download className="size-3.5" />
                  Invoice
                </a>
              ) : (
                <span className="text-slate-400 md:text-right">Unavailable</span>
              )}
            </div>
          ))
        ) : (
          <p className="px-[22px] py-8 text-center text-sm text-slate-500">
            No Stripe invoices are available yet.
          </p>
        )}
      </div>
    </div>
  );
}
