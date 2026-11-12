import { CalendarDays } from "lucide-react";

import type { getBillingSummary } from "@/lib/billing/server";
import type { Locale } from "@/lib/i18n/locales";

import { formatDate } from "./subscription-format";

type BillingSummary = NonNullable<Awaited<ReturnType<typeof getBillingSummary>>>;

export function BillingCycleSection({ billing, locale }: { billing: BillingSummary; locale: Locale }) {
  return (
    <section className="rounded-[14px] border bg-white p-[22px] shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
        <CalendarDays className="size-5 text-olea-green" />
        {billing.fundedBySponsor || billing.developerAccess ? "Membership period" : "Billing cycle"}
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <BillingCycleMetric
          label="Cycle"
          value={billing.developerAccess ? "Developer access" : billing.fundedBySponsor ? "Funded year" : billing.billingInterval === "year" ? "Annual" : "Quarterly"}
        />
        <BillingCycleMetric
          label="Current period"
          value={getCurrentPeriodLabel(billing, locale)}
        />
      </dl>
      <BillingScheduleNotice billing={billing} locale={locale} />
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

function BillingScheduleNotice({ billing, locale }: { billing: BillingSummary; locale: Locale }) {
  const notice = getBillingScheduleNotice(billing, locale);
  if (!notice) return null;

  return (
    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">
      {notice}
    </p>
  );
}

function getCurrentPeriodLabel(billing: BillingSummary, locale: Locale) {
  if (billing.developerAccess) {
    return billing.currentPeriodEnd
      ? `${formatDate(billing.currentPeriodStart ?? billing.currentPeriodEnd, locale)} – ${formatDate(billing.currentPeriodEnd, locale)}`
      : locale === "fr-CA" ? "Aucune fin prévue" : "No scheduled end";
  }
  if (billing.billingUnavailable) {
    return locale === "fr-CA" ? "Date de facturation indisponible" : "Billing date unavailable";
  }

  if (!billing.currentPeriodStart || !billing.currentPeriodEnd) {
    return locale === "fr-CA" ? "Confirmation de facturation en attente" : "Pending billing confirmation";
  }

  return `${formatDate(billing.currentPeriodStart, locale)} – ${formatDate(
    billing.currentPeriodEnd, locale,
  )}`;
}

function getBillingScheduleNotice(billing: BillingSummary, locale: Locale) {
  if (billing.fundedBySponsor && billing.currentPeriodEnd) {
    const date = formatDate(billing.currentPeriodEnd, locale);
    return locale === "fr-CA"
      ? `Votre année financée se termine le ${date}. Communiquez avec Olea Connects pour discuter de la poursuite de l’accès.`
      : `Your funded year ends on ${date}. Contact Olea Connects to discuss continued access.`;
  }
  if (billing.pauseStartsAt && billing.pauseEndsAt) {
    const start = formatDate(billing.pauseStartsAt, locale);
    const end = formatDate(billing.pauseEndsAt, locale);
    return locale === "fr-CA" ? `En pause du ${start} au ${end}.` : `Paused from ${start} until ${end}.`;
  }

  if (billing.cancelAtPeriodEnd && billing.currentPeriodEnd) {
    const date = formatDate(billing.currentPeriodEnd, locale);
    return locale === "fr-CA" ? `L’annulation est prévue pour le ${date}.` : `Cancellation is scheduled for ${date}.`;
  }

  if (!billing.canceledAt) return null;
  const date = formatDate(billing.canceledAt, locale);
  return locale === "fr-CA" ? `Annulé le ${date}.` : `Canceled on ${date}.`;
}
