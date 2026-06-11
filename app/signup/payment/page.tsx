"use client";

import { Lock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistration } from "@/hooks/use-registration";
import {
  createCheckoutSession,
  triggerNewSubscriptionAutomations,
} from "@/lib/auth";
import { getPlan } from "@/lib/plans";

const provinces = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
];

export default function SignupPaymentPage() {
  const router = useRouter();
  const { registration, updateRegistration } = useRegistration();
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/30");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState(registration.fullName);
  const [isPending, startTransition] = useTransition();
  const plan = getPlan(registration.tier);
  const price =
    registration.billingCycle === "annual"
      ? plan.annualPrice
      : plan.monthlyPrice;
  const billingPeriod =
    registration.billingCycle === "annual" ? "year" : "month";
  const valid = cardNumber.replace(/\s/g, "").length === 16 && expiry && cvc && name;

  const handlePayment = () => {
    startTransition(async () => {
      await createCheckoutSession(registration);
      await triggerNewSubscriptionAutomations({ tier: registration.tier });
      router.push("/verify-email");
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader minimal />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <StepIndicator current={3} />
        <h1 className="mt-5 text-center text-3xl font-bold">
          Activate your membership
        </h1>
        <p className="mt-2 text-center text-slate-500">
          Step 3 of 3 · Review your plan and complete payment.
        </p>

        <div className="mt-8 grid items-start gap-6 md:grid-cols-[1fr_360px]">
          <section className="rounded-[14px] border bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Payment details</h2>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input
                  id="cardNumber"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameOnCard">Name on card</Label>
                <Input
                  id="nameOnCard"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Billing province</Label>
                <select
                  id="province"
                  value={registration.province}
                  onChange={(event) =>
                    updateRegistration({ province: event.target.value })
                  }
                  className="h-11 w-full rounded-md border border-input bg-white px-3.5 text-sm outline-none focus:border-olea-green focus:ring-2 focus:ring-olea-green/20"
                >
                  {provinces.map((province) => (
                    <option key={province}>{province}</option>
                  ))}
                </select>
              </div>
              <Button
                className="w-full"
                disabled={!valid || isPending}
                onClick={handlePayment}
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {isPending ? "Creating membership..." : "Activate membership →"}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Lock className="size-3.5" /> Secured by Stripe · Demo checkout
              </p>
            </div>
          </section>

          <aside className="rounded-[14px] border bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
              Order summary
            </p>
            <h2 className="mt-4 text-xl font-bold">
              {plan.icon} {plan.name}
            </h2>
            <p className="mt-1 capitalize text-slate-500">
              {registration.billingCycle} billing
            </p>
            <p className="mt-5 text-3xl font-bold">
              ${price.toLocaleString()}
              <span className="text-sm font-normal text-slate-400">
                /{billingPeriod}
              </span>
            </p>
            {registration.billingCycle === "annual" ? (
              <p className="mt-1 text-xs font-semibold text-olea-green">
                Pay for 10 months and receive 12
              </p>
            ) : null}
            <div className="my-5 border-t" />
            <p className="font-semibold text-olea-dark">
              Membership starts immediately
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your selected billing amount is charged when you activate your
              membership. GST/HST is calculated from your billing province.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              <li>✓ Cancel any time</li>
              <li>✓ Prices in Canadian dollars</li>
              <li>✓ Immediate platform access after verification</li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
