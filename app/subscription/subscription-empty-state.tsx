import { AlertTriangle, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { ActivationRetryButton } from "@/components/auth/ActivationRetryButton";
import type { getBillingActivationRecovery } from "@/lib/billing/server";

type BillingActivation = Awaited<ReturnType<typeof getBillingActivationRecovery>>;

export function SubscriptionEmptyState({
  activation,
}: {
  activation: BillingActivation;
}) {
  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Manage your membership and billing."
      />
      <section className="rounded-[14px] border bg-white p-8 shadow-soft">
        {activation ? <ActivationPendingState activation={activation} /> : <MissingBillingState />}
      </section>
    </div>
  );
}

function ActivationPendingState({
  activation,
}: {
  activation: NonNullable<BillingActivation>;
}) {
  return (
    <>
      <Clock3 className="size-8 text-amber-600" />
      <h2 className="mt-4 text-lg font-bold text-slate-800">
        Membership activation is still syncing
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        We found your signup activation record, but the membership has not
        finished attaching to this workspace yet. Do not start a new checkout.
        Retry activation below, or contact support if it keeps failing.
      </p>
      <dl className="mt-5 grid max-w-xl gap-3 text-sm sm:grid-cols-2">
        <ActivationDetail label="Signed-in account" value={activation.email || "Unknown"} />
        <ActivationDetail
          label="Activation status"
          value={activation.status.replaceAll("_", " ")}
        />
        <ActivationDetail label="Selected plan" value={activation.planId} />
      </dl>
      {activation.lastError ? (
        <p className="mt-4 max-w-xl rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {activation.lastError}
        </p>
      ) : null}
      <div className="max-w-xs">
        <ActivationRetryButton />
      </div>
      <SupportPrompt />
    </>
  );
}

function MissingBillingState() {
  return (
    <>
      <AlertTriangle className="size-8 text-amber-600" />
      <h2 className="mt-4 text-lg font-bold text-slate-800">
        Billing setup is incomplete
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        We could not find a membership or activation record for your
        organization. If you already paid, contact support before starting
        another checkout.
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
  );
}

function ActivationDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-all font-semibold capitalize text-slate-700">
        {value}
      </dd>
    </div>
  );
}

function SupportPrompt() {
  return (
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
  );
}
