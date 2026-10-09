"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { SectionIntro } from "@/components/landing/SectionIntro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/locales";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { signupMembershipPlans } from "@/lib/plans";
import { fixedPriceOffers, formatCad, foundingYearPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type LandingPricingCopy = PublicSiteCopy["pricing"];

export function LandingPricing({
  copy,
  locale,
}: {
  copy: LandingPricingCopy;
  locale: Locale;
}) {
  const quoteHref = (service: string) => {
    const subject = encodeURIComponent(`Olea Connects: ${service}`);
    const body = encodeURIComponent(
      locale === "fr-CA"
        ? "Organisme :\nSoutien souhaité :\nÉchéancier :\n"
        : "Organization:\nSupport needed:\nPreferred timeline:\n",
    );
    return `mailto:hello@olivesocialimpact.com?subject=${subject}&body=${body}`;
  };
  const fixedOfferPrice = (offer: keyof typeof fixedPriceOffers) => {
    const { amount, cadence } = fixedPriceOffers[offer];
    return cadence === "annual"
      ? `${formatCad(amount, locale)} / ${copy.perYear}`
      : `${formatCad(amount, locale)} ${copy.perOneTime}`;
  };

  return (
    <section id="plans" className="bg-slate-50 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          centered
        />
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-olea-green/20 bg-white p-4 text-center text-sm leading-6 text-slate-600 shadow-sm">
          <strong className="text-olea-dark">{copy.foundingLabel}</strong>{" "}
          {copy.foundingNotice}
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {signupMembershipPlans.map((plan) => {
            const planCopy = copy.plans[plan.id];
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col p-6 shadow-none",
                  plan.popular &&
                    "border-2 border-olea-green shadow-[0_16px_45px_rgba(74,124,89,0.13)]",
                )}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#B54708] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {copy.mostPopular}
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-slate-500">
                  {planCopy.audience}
                </p>
                <h3 className="mt-3 text-2xl font-extrabold">
                  {planCopy.name}
                </h3>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {formatCad(plan.annualPrice, locale)}
                  </span>
                  <span className="pb-1 text-sm text-slate-600">
                    /{copy.perYear}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-olea-green">
                  {copy.foundingPriceLabel} {formatCad(foundingYearPrice(plan.annualPrice), locale)}
                </p>
                <p className="mt-5 min-h-12 text-sm leading-6 text-slate-500">
                  {planCopy.summary}
                </p>
                <p className="mt-4 border-y py-3 text-sm font-bold">
                  {planCopy.seats}
                </p>
                <ul className="mt-5 flex-1 space-y-3">
                  {planCopy.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2.5 text-sm leading-5 text-slate-600"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-7 w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  <Link
                    href={`/signup/account?tier=${plan.id}&billing=annual`}
                  >
                    {copy.choosePlan} {planCopy.name}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
        <div className="mt-7 grid gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
          {copy.policies.map((policy) => (
            <p
              key={policy}
              className="rounded-xl border bg-white p-4 text-center"
            >
              {policy}
            </p>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl">
        <SectionIntro
          eyebrow={copy.optionalSupportEyebrow}
          title={copy.optionalSupportTitle}
          description={copy.optionalSupportDescription}
          centered
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {copy.addOns.map((addOn) => (
            <Card key={addOn.id} className="flex flex-col p-6 shadow-none">
              <h3 className="text-xl font-bold">{addOn.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                {addOn.description}
              </p>
              <p className="mt-5 font-semibold text-olea-dark">
                {fixedOfferPrice(addOn.id)}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <a href={quoteHref(addOn.name)}>
                  {copy.contactToArrange}
                </a>
              </Button>
            </Card>
          ))}
          <Card className="flex flex-col p-6 shadow-none">
            <h3 className="text-xl font-bold">{copy.retreatTitle}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
              {copy.retreatDescription}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <a href={quoteHref(copy.retreatTitle)}>
                {copy.requestQuote}
              </a>
            </Button>
          </Card>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl">
        <SectionIntro
          eyebrow={copy.sponsorshipEyebrow}
          title={copy.sponsorshipTitle}
          description={copy.sponsorshipDescription}
          centered
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {copy.sponsorshipOffers.map((offer) => (
            <Card key={offer.id} className="flex flex-col p-6 shadow-none">
              <h3 className="text-xl font-bold">{offer.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                {offer.description}
              </p>
              <p className="mt-5 font-semibold text-olea-dark">
                {fixedOfferPrice(offer.id)}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <a href={quoteHref(offer.name)}>{copy.contactToArrange}</a>
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl">
        <Card className="border-olea-dark bg-olea-dark p-8 text-white shadow-none md:p-10">
          <SectionIntro
            eyebrow={copy.referralsEyebrow}
            title={copy.referralsTitle}
            description={copy.referralsDescription}
            centered
            inverse
          />
          <div className="mt-8 text-center">
            <Button asChild className="bg-white text-olea-dark hover:bg-green-50">
              <Link href="/referrals">{copy.referralsCta}</Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
