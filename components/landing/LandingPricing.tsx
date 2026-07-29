"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SectionIntro } from "@/components/landing/SectionIntro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { membershipPlans } from "@/lib/plans";
import {
  formatCad,
  pricingAddOns,
  pricingPolicies,
  referralRewards,
  retreatFacilitation,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function LandingPricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="plans" className="bg-slate-50 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Membership"
          title="Choose the support that fits today."
          description={`${pricingPolicies.foundingMember} Annual and quarterly memberships are paid upfront.`}
          centered
        />
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-olea-green/20 bg-white p-4 text-center text-sm leading-6 text-slate-600 shadow-sm">
          <strong className="text-olea-dark">Founding member offer:</strong>{" "}
          {pricingPolicies.foundingMember} Prices below show regular rates and
          the potential Year 1 founding rate. Eligibility is confirmed before
          payment.
        </div>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
            <button
              type="button"
              aria-pressed={!annual}
              onClick={() => setAnnual(false)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                !annual ? "bg-olea-green text-white" : "text-slate-500",
              )}
            >
              Quarterly
            </button>
            <button
              type="button"
              aria-pressed={annual}
              onClick={() => setAnnual(true)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                annual ? "bg-olea-green text-white" : "text-slate-500",
              )}
            >
              Annual
              <span className="ml-2 rounded-full bg-[#B54708] px-2 py-0.5 text-[10px] text-white">
                Best for renewal planning
              </span>
            </button>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {membershipPlans.map((plan) => {
            const price = annual ? plan.annualPrice : plan.quarterlyPrice;
            const foundingPrice = annual
              ? plan.foundingAnnualPrice
              : plan.foundingQuarterlyPrice;
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
                    Most popular
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-slate-500">
                  {plan.audience}
                </p>
                <h3 className="mt-3 text-2xl font-extrabold">
                  {plan.icon} {plan.name}
                </h3>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {formatCad(price)}
                  </span>
                  <span className="pb-1 text-sm text-slate-600">
                    /{annual ? "year" : "quarter"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-olea-green">
                  Founding Year 1: {formatCad(foundingPrice)}/
                  {annual ? "year" : "quarter"} · eligibility confirmed before
                  payment
                </p>
                <p className="mt-5 min-h-12 text-sm leading-6 text-slate-500">
                  {plan.summary}
                </p>
                <p className="mt-4 border-y py-3 text-sm font-bold">
                  {plan.seats}
                </p>
                <ul className="mt-5 flex-1 space-y-3">
                  {plan.features.map((feature) => (
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
                    href={`/signup/account?tier=${plan.id}&billing=${
                      annual ? "annual" : "quarterly"
                    }`}
                  >
                    Choose {plan.name}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
        <div className="mt-7 grid gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
          <p className="rounded-xl border bg-white p-4 text-center">
            {pricingPolicies.extraSeat}
          </p>
          <p className="rounded-xl border bg-white p-4 text-center">
            {pricingPolicies.taxes}
          </p>
          <p className="rounded-xl border bg-white p-4 text-center">
            {pricingPolicies.trial}
          </p>
          <p className="rounded-xl border bg-white p-4 text-center">
            {pricingPolicies.cancellation}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl">
        <SectionIntro
          eyebrow="Optional support"
          title="Add capacity when your team needs it."
          description="Add-ons are available to every tier. Canopy and Harvest members receive 10% off coaching and admin packages."
          centered
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricingAddOns.map((addOn) => (
            <Card key={addOn.name} className="p-6 shadow-none">
              <h3 className="text-xl font-bold">{addOn.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {addOn.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-olea-green">
                {addOn.rateLabel}
              </p>
              <div className="mt-5 overflow-hidden rounded-lg border">
                {addOn.packages.map((pack) => (
                  <div
                    key={pack.name}
                    className="flex flex-col gap-2 border-b px-4 py-3 text-sm last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="font-semibold">{pack.name}</span>
                      <span className="ml-2 text-slate-500">{pack.hours}</span>
                    </span>
                    <span className="font-semibold text-slate-700 sm:text-right">
                      <span className="block whitespace-nowrap">
                        {formatCad(pack.quarterlyPrice)}/quarter
                      </span>
                      <span className="block whitespace-nowrap text-xs font-normal text-slate-500">
                        {formatCad(pack.annualPrice)}/year
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Annual prices are shown for planning. Contact us for hourly or
                package support.
              </p>
            </Card>
          ))}
          <Card className="p-6 shadow-none">
            <h3 className="text-xl font-bold">Board Retreat Facilitation</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Professional facilitation for annual board retreats and strategic
              planning sessions.
            </p>
            <div className="mt-5 overflow-hidden rounded-lg border">
              {retreatFacilitation.map((option) => (
                <div
                  key={option.name}
                  className="flex items-center justify-between border-b px-4 py-3 text-sm last:border-b-0"
                >
                  <span>
                    <span className="font-semibold">{option.name}</span>
                    <span className="ml-2 text-slate-500">{option.detail}</span>
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formatCad(option.price)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Available on an ad-hoc basis.
            </p>
          </Card>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl">
        <Card className="border-olea-dark bg-olea-dark p-8 text-white shadow-none md:p-10">
          <SectionIntro
            eyebrow="Circle of generosity"
            title="Your referrals help another nonprofit access support."
            description="Referral credit is earned after a referred organization completes its first successful payment. Self-referrals are not eligible."
            centered
            inverse
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {referralRewards.map((reward) => (
              <div key={reward.referrals} className="rounded-xl bg-white/10 p-5">
                <p className="font-bold text-olea-gold">{reward.referrals}</p>
                <p className="mt-3 text-sm text-white">{reward.grant}</p>
                <p className="mt-2 text-sm text-white/70">{reward.coaching}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
