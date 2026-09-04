import { CalendarDays } from "lucide-react";

import type { getBillingSummary } from "@/lib/billing/server";

import { formatDate } from "./subscription-format";

type BillingSummary = NonNullable<Awaited<ReturnType<typeof getBillingSummary>>>;

export function BillingCycleSection({ billing }: { billing: BillingSummary }) {
  return (
    <section className="rounded-[14px] border bg-white p-[22px] shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
        <CalendarDays className="size-5 text-olea-green" />
        Billing cycle
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <BillingCycleMetric
          label="Cycle"
          value={billing.billingInterval === "year" ? "Annual" : "Quarterly"}
        />
        <BillingCycleMetric
          label="Current period"
          value={getCurrentPeriodLabel(billing)}
        />
      </dl>
      <BillingScheduleNotice billing={billing} />
    </section>
  );
}

function BillingCycleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold capitalize text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function BillingScheduleNotice({ billing }: { billing: BillingSummary }) {
  const notice = getBillingScheduleNotice(billing);
  if (!notice) return null;

  return (
    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">
      {notice}
    </p>
  );
}

function getCurrentPeriodLabel(billing: BillingSummary) {
  if (!billing.currentPeriodStart || !billing.currentPeriodEnd) {
    return "Pending billing confirmation";
  }

  return `${formatDate(billing.currentPeriodStart)} - ${formatDate(
    billing.currentPeriodEnd,
  )}`;
}

function getBillingScheduleNotice(billing: BillingSummary) {
  if (billing.pauseStartsAt && billing.pauseEndsAt) {
    return `Paused from ${formatDate(billing.pauseStartsAt)} until ${formatDate(
      billing.pauseEndsAt,
    )}.`;
  }

  if (billing.cancelAtPeriodEnd && billing.currentPeriodEnd) {
    return `Cancellation is scheduled for ${formatDate(billing.currentPeriodEnd)}.`;
  }

  return billing.canceledAt ? `Canceled on ${formatDate(billing.canceledAt)}.` : null;
}
