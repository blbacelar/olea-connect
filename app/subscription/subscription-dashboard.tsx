import {
  AlertTriangle,
  CheckCircle2,
  Sprout,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import type { getBillingSummary } from "@/lib/billing/server";
import { formatPaidSeatPrice } from "@/lib/billing/seat-pricing";

import {
  BillingManagementControls,
  PlanUpgradeControls,
  SeatManagementControls,
} from "./billing-actions";
import { BillingCycleSection } from "./subscription-cycle";
import {
  formatBillingInterval,
  formatDate,
  formatMoney,
  getPlanUpgradedMessage,
  getSeatAddedMessage,
  getSeatPaymentMessage,
  isMembershipTier,
  statusLabels,
} from "./subscription-format";
import { BillingHistory } from "./subscription-history";

type BillingSummary = NonNullable<Awaited<ReturnType<typeof getBillingSummary>>>;
type SubscriptionSearchParams = {
  quantity?: string;
  plan?: string;
  seat?: string;
  tier?: string;
};

export function SubscriptionDashboard({
  billing,
  searchParams,
}: {
  billing: BillingSummary;
  searchParams?: SubscriptionSearchParams;
}) {
  const canManage = billing.role === "owner" || billing.role === "admin";
  const accessRestricted = !["active", "trialing"].includes(billing.status);
  const totalSeats = billing.includedSeats + billing.seatQuantity;
  const isPaused = billing.status === "paused";
  const primaryDate = isPaused ? billing.pauseEndsAt : billing.currentPeriodEnd;
  const currentPlanId = isMembershipTier(billing.planId)
    ? billing.planId
    : "seedling";

  return (
    <div>
      <PageHeader
        title="Subscription"
        description={`Manage billing for ${billing.organizationName}.`}
      />
      <AccessNotice accessRestricted={accessRestricted} status={billing.status} />
      <CurrentPlanCard
        accessRestricted={accessRestricted}
        billing={billing}
        isPaused={isPaused}
        primaryDate={primaryDate}
      />
      <div className="mb-7">
        <PlanUpgradeControls
          billingInterval={billing.billingInterval}
          canManage={canManage}
          currentPlanId={currentPlanId}
          disabled={
            !billing.customerId ||
            !billing.subscriptionId ||
            accessRestricted ||
            billing.cancelAtPeriodEnd
          }
          initialSuccessMessage={
            searchParams?.plan === "upgraded"
              ? getPlanUpgradedMessage(searchParams.tier)
              : undefined
          }
        />
      </div>
      <div className="mb-7 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SeatUsageSection
          accessRestricted={accessRestricted}
          billing={billing}
          canManage={canManage}
          searchParams={searchParams}
          totalSeats={totalSeats}
        />
        <BillingCycleSection billing={billing} />
      </div>
      <div className="mb-7">
        <BillingManagementControls
          canManage={canManage}
          disabled={!billing.customerId || !billing.subscriptionId}
          isPaused={isPaused}
        />
      </div>
      <BillingHistory billing={billing} />
    </div>
  );
}

function AccessNotice({
  accessRestricted,
  status,
}: {
  accessRestricted: boolean;
  status: BillingSummary["status"];
}) {
  if (accessRestricted) {
    return (
      <section className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Your membership needs attention</p>
          <p className="mt-1 text-sm leading-6">
            Platform access is limited while the subscription is{" "}
            {statusLabels[status].toLowerCase()}. An organization owner or
            administrator can resolve this through billing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
      <p className="text-sm font-semibold">
        Your membership is active and platform access is enabled.
      </p>
    </section>
  );
}

function CurrentPlanCard({
  accessRestricted,
  billing,
  isPaused,
  primaryDate,
}: {
  accessRestricted: boolean;
  billing: BillingSummary;
  isPaused: boolean;
  primaryDate: string | null;
}) {
  return (
    <section className="mb-7 rounded-[14px] border bg-white p-[26px] shadow-soft">
      <div className="grid gap-6 md:grid-cols-3">
        <CurrentPlanColumn billing={billing} />
        <PlanStatusColumn
          accessRestricted={accessRestricted}
          billing={billing}
        />
        <BillingDateColumn
          billing={billing}
          isPaused={isPaused}
          primaryDate={primaryDate}
        />
      </div>
    </section>
  );
}

function CurrentPlanColumn({ billing }: { billing: BillingSummary }) {
  return (
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
        {formatBillingInterval(billing.billingInterval)}
      </p>
    </div>
  );
}

function PlanStatusColumn({
  accessRestricted,
  billing,
}: {
  accessRestricted: boolean;
  billing: BillingSummary;
}) {
  return (
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
  );
}

function BillingDateColumn({
  billing,
  isPaused,
  primaryDate,
}: {
  billing: BillingSummary;
  isPaused: boolean;
  primaryDate: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
        {billing.cancelAtPeriodEnd
          ? "Access ends"
          : isPaused
            ? "Pause resumes"
            : "Next billing date"}
      </p>
      <p className="mt-2 text-base font-semibold">
        {primaryDate ? formatDate(primaryDate) : "Pending billing confirmation"}
      </p>
      <p className="mt-1 text-[13px] text-slate-500">
        {billing.paymentMethod ?? "Payment method not available"}
      </p>
    </div>
  );
}

function SeatUsageSection({
  accessRestricted,
  billing,
  canManage,
  searchParams,
  totalSeats,
}: {
  accessRestricted: boolean;
  billing: BillingSummary;
  canManage: boolean;
  searchParams?: SubscriptionSearchParams;
  totalSeats: number;
}) {
  return (
    <section className="rounded-[14px] border bg-white p-[22px] shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
        <Users className="size-5 text-olea-green" />
        Seat usage
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <SeatMetric label="Used" value={billing.seatsUsed} />
        <SeatMetric label="Reserved" value={billing.seatsReserved} />
        <SeatMetric label="Available" value={Math.max(totalSeats - billing.seatsReserved, 0)} />
      </dl>
      <p className="mt-4 text-sm leading-6 text-slate-500">
        {billing.includedSeats} included seat
        {billing.includedSeats === 1 ? "" : "s"} plus {billing.seatQuantity}{" "}
        paid seat add-on{billing.seatQuantity === 1 ? "" : "s"} at{" "}
        {formatPaidSeatPrice()}.
      </p>
      <SeatManagementControls
        canManage={canManage}
        disabled={!billing.customerId || !billing.subscriptionId || accessRestricted}
        initialSuccessMessage={
          searchParams?.seat === "added"
            ? getSeatAddedMessage(searchParams.quantity)
            : getSeatPaymentMessage(searchParams?.seat) || undefined
        }
        seatPriceLabel={formatPaidSeatPrice()}
      />
    </section>
  );
}

function SeatMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-bold text-slate-800">{value}</dd>
    </div>
  );
}
