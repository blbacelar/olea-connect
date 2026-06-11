"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { Button } from "@/components/ui/button";
import { useRegistration } from "@/hooks/use-registration";
import { membershipPlans } from "@/lib/plans";
import type { MembershipTier } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SignupPlanPage() {
  const router = useRouter();
  const { hydrated, registration, updateRegistration } = useRegistration();

  useEffect(() => {
    if (!hydrated) return;
    const tier = new URLSearchParams(window.location.search).get(
      "tier",
    ) as MembershipTier | null;
    const billingCycle = new URLSearchParams(window.location.search).get(
      "billing",
    );
    const updates: {
      tier?: MembershipTier;
      billingCycle?: "monthly" | "annual";
    } = {};
    if (tier && membershipPlans.some((plan) => plan.id === tier)) {
      updates.tier = tier;
    }
    if (billingCycle === "monthly" || billingCycle === "annual") {
      updates.billingCycle = billingCycle;
    }
    if (updates.tier || updates.billingCycle) {
      updateRegistration(updates);
    }
  }, [hydrated, updateRegistration]);

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader minimal />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <StepIndicator current={1} />
        <h1 className="mt-5 text-center text-3xl font-bold">
          Choose your plan
        </h1>
        <p className="mt-2 text-center text-slate-500">
          Step 1 of 3 · Choose the support that fits your organization.
        </p>

        <div className="mx-auto mt-7 flex w-fit rounded-lg border bg-white p-1">
          {(["monthly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => updateRegistration({ billingCycle: cycle })}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold capitalize",
                registration.billingCycle === cycle
                  ? "bg-olea-green text-white"
                  : "text-slate-500",
              )}
            >
              {cycle}
              {cycle === "annual" ? " · 2 months free" : ""}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {membershipPlans.map((plan) => {
            const selected = registration.tier === plan.id;
            const price =
              registration.billingCycle === "annual"
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;
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
                <p className="text-lg font-bold">
                  {plan.icon} {plan.name}
                </p>
                <p className="mt-4 text-3xl font-bold">
                  ${price}
                  <span className="text-sm font-normal text-slate-400">
                    /mo
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-500">{plan.seats}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
                <span className="mt-auto pt-6 text-sm font-semibold text-olea-green">
                  {selected ? "Selected ✓" : "Select plan"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => router.push("/signup/account")}>
            Continue with{" "}
            {membershipPlans.find((plan) => plan.id === registration.tier)?.name}
            {" "}→
          </Button>
        </div>
      </main>
    </div>
  );
}
