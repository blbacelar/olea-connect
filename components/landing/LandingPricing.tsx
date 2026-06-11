"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SectionIntro } from "@/components/landing/SectionIntro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { membershipPlans } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function LandingPricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="plans" className="bg-slate-50 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Membership"
          title="Choose the support that fits today."
          description="There is no wrong place to start. Every tier includes the full Olea community; your resource library grows with your plan."
          centered
        />
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                !annual ? "bg-olea-green text-white" : "text-slate-500",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                annual ? "bg-olea-green text-white" : "text-slate-500",
              )}
            >
              Annual
              <span className="ml-2 rounded-full bg-olea-orange px-2 py-0.5 text-[10px] text-white">
                2 months free
              </span>
            </button>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {membershipPlans.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
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
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-olea-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
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
                    ${price.toLocaleString()}
                  </span>
                  <span className="pb-1 text-sm text-slate-400">
                    /{annual ? "year" : "month"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-olea-green">
                  {annual
                    ? `$${Math.round(plan.annualPrice / 12).toLocaleString()} effective monthly · CAD`
                    : "Billed monthly · CAD"}
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
                  <Link href={`/signup?tier=${plan.id}`}>
                    Choose {plan.name}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="mt-7 text-center text-sm text-slate-500">
          Need breathing room? Members facing a genuine funding gap can request
          a pause of up to 60 days.
        </p>
      </div>
    </section>
  );
}
