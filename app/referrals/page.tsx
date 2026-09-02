import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  HandCoins,
  ShieldCheck,
} from "lucide-react";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { PublicHeader } from "@/components/auth/PublicHeader";
import { Button } from "@/components/ui/button";
import {
  getReferralProgramSettings,
  referralProgramSettingsDefaults,
} from "@/lib/data/referrals";
import { getReferralPageCopy } from "@/lib/i18n/referral-page-copy";
import { getRequestLocale } from "@/lib/i18n/server";
import { formatReferralMoney } from "@/lib/referrals/domain";

import { ReferralApplicationForm } from "./referral-application-form";

export default async function ReferralProgramPage() {
  const locale = getRequestLocale();
  const copy = getReferralPageCopy(locale);
  const settings = await getReferralProgramSettings().catch(
    () => referralProgramSettingsDefaults,
  );
  const total =
    settings.demoAttendedPayoutCents + settings.retainedCustomerPayoutCents;
  const totalFormatted = formatReferralMoney(total, settings.currency, locale);

  return (
    <div className="min-h-screen bg-olea-light">
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-olea-green">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              {copy.heroTitle(totalFormatted)}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              {copy.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#apply">
                  {copy.signUp} <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white">
                <Link href="/referrals/dashboard">{copy.dashboard}</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-white p-6 shadow-soft">
                <HandCoins className="size-8 text-olea-green" />
                <p className="mt-4 text-3xl font-black text-slate-950">
                  {formatReferralMoney(
                    settings.demoAttendedPayoutCents,
                    settings.currency,
                    locale,
                  )}
                </p>
                <p className="mt-1 font-semibold text-slate-700">
                  {copy.demoPayout}
                </p>
              </div>
              <div className="rounded-2xl border bg-white p-6 shadow-soft">
                <ShieldCheck className="size-8 text-olea-green" />
                <p className="mt-4 text-3xl font-black text-slate-950">
                  {formatReferralMoney(
                    settings.retainedCustomerPayoutCents,
                    settings.currency,
                    locale,
                  )}
                </p>
                <p className="mt-1 font-semibold text-slate-700">
                  {copy.retainedPayout}
                </p>
              </div>
            </div>
          </div>

          <div id="apply">
            {settings.programEnabled ? (
              <ReferralApplicationForm copy={copy.form} />
            ) : (
              <section className="rounded-2xl border border-olea-green/20 bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olea-green">
                  {copy.form.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {copy.paused.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {copy.paused.body}
                </p>
              </section>
            )}
          </div>
        </section>

        <section className="border-y bg-white px-4 py-14 md:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-olea-green">
              {copy.howItWorks}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {copy.steps.map((step, index) => (
                <article key={step.title} className="rounded-2xl border p-5">
                  <p className="text-sm font-black text-olea-gold">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-4 text-xl font-bold text-slate-950">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
          <div className="rounded-3xl bg-olea-green p-8 text-white shadow-soft md:p-10">
            <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
              <div>
                <Copy className="size-9 text-olea-gold" />
                <h2 className="mt-4 text-3xl font-black">
                  {copy.closingTitle(totalFormatted)}
                </h2>
                <p className="mt-4 leading-7 text-white/85">
                  {copy.closingBody}
                </p>
              </div>
              <div className="grid gap-4">
                {copy.faqs.map((faq) => (
                  <div
                    key={faq.q}
                    className="rounded-2xl border border-white/15 bg-white/10 p-5"
                  >
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-1 size-5 shrink-0 text-olea-gold" />
                      <div>
                        <h3 className="font-bold">{faq.q}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/80">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
