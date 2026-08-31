import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, HandCoins, Link2 } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getReferralDashboardData,
  type ReferralPayoutRecord,
  type ReferralRecord,
} from "@/lib/data/referrals";
import type { ReferralPageCopy } from "@/lib/i18n/referral-page-copy";
import { getReferralPageCopy } from "@/lib/i18n/referral-page-copy";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { formatReferralMoney } from "@/lib/referrals/domain";
import { getAppUrl } from "@/lib/email/server";

import { ReferralLinkCopy } from "./referral-link-copy";

type ReferralDashboardCopy = ReferralPageCopy["dashboardScreen"];

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function StatusBadge({ children }: { children: string }) {
  return (
    <Badge variant="outline" className="bg-white capitalize">
      {children}
    </Badge>
  );
}

function ReferralTable({
  copy,
  locale,
  referrals,
}: {
  copy: ReferralDashboardCopy;
  locale: Locale;
  referrals: ReferralRecord[];
}) {
  if (referrals.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-600 shadow-soft">
        {copy.emptyReferrals}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">{copy.table.referral}</th>
            <th className="px-4 py-3">{copy.table.organization}</th>
            <th className="px-4 py-3">{copy.table.status}</th>
            <th className="px-4 py-3">{copy.table.lastMilestone}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {referrals.map((referral) => (
            <tr key={referral.id}>
              <td className="px-4 py-4 font-semibold text-slate-800">
                {referral.referredEmail ?? copy.fallback.leadCaptured}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {referral.referredOrganizationName ??
                  copy.fallback.notAvailable}
              </td>
              <td className="px-4 py-4">
                <StatusBadge>
                  {copy.statuses.referral[referral.status]}
                </StatusBadge>
              </td>
              <td className="px-4 py-4 text-slate-600">
                {formatDate(
                  referral.lastMilestoneAt,
                  locale,
                  copy.fallback.notSet,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutTable({
  copy,
  locale,
  payouts,
}: {
  copy: ReferralDashboardCopy;
  locale: Locale;
  payouts: ReferralPayoutRecord[];
}) {
  if (payouts.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-600 shadow-soft">
        {copy.emptyPayouts}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">{copy.table.milestone}</th>
            <th className="px-4 py-3">{copy.table.amount}</th>
            <th className="px-4 py-3">{copy.table.status}</th>
            <th className="px-4 py-3">{copy.table.due}</th>
            <th className="px-4 py-3">{copy.table.paid}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payouts.map((payout) => (
            <tr key={payout.id}>
              <td className="px-4 py-4 font-semibold text-slate-800">
                {copy.statuses.milestones[payout.milestone]}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {formatReferralMoney(
                  payout.amountCents,
                  payout.currency,
                  locale,
                )}
              </td>
              <td className="px-4 py-4">
                <StatusBadge>{copy.statuses.payout[payout.status]}</StatusBadge>
              </td>
              <td className="px-4 py-4 text-slate-600">
                {formatDate(payout.dueAt, locale, copy.fallback.notSet)}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {formatDate(payout.paidAt, locale, copy.fallback.notSet)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReferralDashboardPage() {
  const locale = getRequestLocale();
  const copy = getReferralPageCopy(locale).dashboardScreen;
  let data: Awaited<ReturnType<typeof getReferralDashboardData>>;
  try {
    data = await getReferralDashboardData();
  } catch {
    notFound();
  }

  const approvedLink = data.referrer?.links.find((link) => link.active);
  const referralUrl = approvedLink
    ? new URL(`/ref/${approvedLink.code}`, getAppUrl()).toString()
    : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="bg-white">
        <Link href="/referrals">
          <ArrowLeft className="size-4" /> {copy.back}
        </Link>
      </Button>

      <PageHeader title={copy.title} description={copy.description} />

      {!data.referrer ? (
        <section className="rounded-2xl border bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-900">
            {copy.applyTitle}
          </h2>
          <p className="mt-2 text-slate-600">{copy.applyBody}</p>
          <Button asChild className="mt-5">
            <Link href="/referrals#apply">{copy.applyCta}</Link>
          </Button>
        </section>
      ) : data.referrer.status !== "approved" || !referralUrl ? (
        <section className="rounded-2xl border bg-white p-8 shadow-soft">
          <Badge variant="outline" className="bg-white">
            {copy.statuses.referrer[data.referrer.status]}
          </Badge>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            {copy.pendingTitle(copy.statuses.referrer[data.referrer.status])}
          </h2>
          <p className="mt-2 text-slate-600">
            {data.referrer.statusReason ?? copy.pendingBody}
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-olea-green">
                  <Link2 className="size-4" /> {copy.approvedLink}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  {copy.shareLink}
                </h2>
                <p className="mt-2 max-w-2xl text-slate-600">
                  {copy.shareLinkBody}
                </p>
              </div>
              <Button asChild variant="outline" className="bg-white">
                <a href={referralUrl} target="_blank" rel="noreferrer">
                  {copy.openLink} <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <div className="mt-5">
              <ReferralLinkCopy copy={copy} referralUrl={referralUrl} />
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {copy.metrics.referrals}
              </p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {data.referrals.length}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {copy.metrics.eligiblePayouts}
              </p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {
                  data.payouts.filter((payout) => payout.status === "eligible")
                    .length
                }
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <HandCoins className="size-4" /> {copy.metrics.paid}
              </p>
              <p className="mt-2 text-4xl font-black text-slate-900">
                {formatReferralMoney(
                  data.payouts
                    .filter((payout) => payout.status === "paid")
                    .reduce((total, payout) => total + payout.amountCents, 0),
                  data.settings.currency,
                  locale,
                )}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              {copy.metrics.referrals}
            </h2>
            <ReferralTable
              copy={copy}
              locale={locale}
              referrals={data.referrals}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              {copy.metrics.eligiblePayouts}
            </h2>
            <PayoutTable copy={copy} locale={locale} payouts={data.payouts} />
          </section>
        </>
      )}
    </div>
  );
}
