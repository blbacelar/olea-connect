"use client";

import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { PublicHeader } from "@/components/auth/PublicHeader";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { Button } from "@/components/ui/button";
import { useRegistration } from "@/hooks/use-registration";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { membershipPlans } from "@/lib/plans";
import { formatCad } from "@/lib/pricing";
import type { MembershipTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { captureReferralCodeFromUrl } from "@/lib/referral-capture";

export default function SignupPlanPage() {
  const router = useRouter();
  const { hydrated, registration, updateRegistration } = useRegistration();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const signupCopy = authCopy.signup.plan;

  useEffect(() => {
    if (!hydrated) return;
    const referralCode = captureReferralCodeFromUrl();
    const tier = new URLSearchParams(window.location.search).get(
      "tier",
    ) as MembershipTier | null;
    const billingCycle = new URLSearchParams(window.location.search).get(
      "billing",
    );
    const updates: {
      tier?: MembershipTier;
      billingCycle?: "quarterly" | "annual";
      referralCode?: string;
    } = {};
    if (tier && membershipPlans.some((plan) => plan.id === tier)) {
      updates.tier = tier;
    }
    if (billingCycle === "quarterly" || billingCycle === "monthly") {
      updates.billingCycle = "quarterly";
    }
    if (billingCycle === "annual") {
      updates.billingCycle = "annual";
    }
    if (updates.tier || updates.billingCycle) {
      updateRegistration(updates);
    }
    if (referralCode && !registration.referralCode) {
      updateRegistration({ referralCode });
    }
  }, [hydrated, registration.referralCode, updateRegistration]);

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader minimal />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <StepIndicator current={1} />
        <h1 className="mt-5 text-center text-3xl font-bold">
          {signupCopy.title}
        </h1>
        <p className="mt-2 text-center text-slate-500">
          {authCopy.signup.step(1, 3)} · {signupCopy.description}
        </p>

        <div className="mx-auto mt-7 flex w-fit rounded-lg border bg-white p-1">
          {(["quarterly", "annual"] as const).map((cycle) => (
            <Button
              type="button"
              variant="ghost"
              key={cycle}
              onClick={() => updateRegistration({ billingCycle: cycle })}
              className={cn(
                "h-10 rounded-md px-4 text-sm font-semibold",
                registration.billingCycle === cycle
                  ? "bg-olea-green text-white"
                  : "text-slate-500",
              )}
            >
              {cycle === "annual" ? signupCopy.annual : signupCopy.quarterly}
              {cycle === "annual" ? ` · ${signupCopy.bestValue}` : ""}
            </Button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {membershipPlans.map((plan) => {
            const selected = registration.tier === plan.id;
            const localizedPlan = publicCopy.pricing.plans[plan.id];
            const price =
              registration.billingCycle === "annual"
                ? plan.annualPrice
                : plan.quarterlyPrice;
            return (
              <button
                key={plan.id}
                onClick={() => updateRegistration({ tier: plan.id })}
                className={cn(
                  "relative flex min-h-[330px] flex-col rounded-[14px] border bg-white p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-olea-green",
                  selected && "border-2 border-olea-green bg-olea-light/40",
                )}
              >
                {selected ? (
                  <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-olea-green text-white">
                    <Check className="size-4" />
                  </span>
                ) : null}
                <p className="text-lg font-bold">{localizedPlan.name}</p>
                <p className="mt-4 text-3xl font-bold">
                  {formatCad(price, locale)}
                  <span className="text-sm font-normal text-slate-400">
                    /
                    {registration.billingCycle === "annual"
                      ? publicCopy.pricing.perYear
                      : publicCopy.pricing.perQuarter}
                  </span>
                </p>
                <p className="mt-1 text-xs font-semibold text-olea-green">
                  {signupCopy.foundingEligibility}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {localizedPlan.seats}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {localizedPlan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-auto pt-6 text-sm font-semibold text-olea-green">
                  {selected ? signupCopy.selected : signupCopy.selectPlan}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-slate-500">
          {publicCopy.pricing.foundingNotice} {signupCopy.policyNote}
        </p>
        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => router.push("/signup/account")}>
            {signupCopy.continueWith(
              publicCopy.pricing.plans[registration.tier].name,
            )}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
