"use client";

import { Lock, LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegistration } from "@/hooks/use-registration";
import { startStripeCheckout } from "@/lib/auth";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
import { getPlan } from "@/lib/plans";
import { formatCad } from "@/lib/pricing";

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
  const { registration, updateRegistration } = useRegistration();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const plan = getPlan(registration.tier);
  const price =
    registration.billingCycle === "annual"
      ? plan.annualPrice
      : plan.quarterlyPrice;
  const billingPeriod =
    registration.billingCycle === "annual" ? "year" : "quarter";
  const allConsentsGranted = Object.values(registration.consents).every(Boolean);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("payment") === "canceled"
    ) {
      setError(
        "Checkout was canceled. Your account was created, so verify your email and sign in when you are ready to continue.",
      );
    }
  }, []);

  const handlePayment = () => {
    if (!allConsentsGranted) {
      setError("Review and accept each required policy before continuing.");
      return;
    }
    startTransition(async () => {
      try {
        setError("");
        const checkoutUrl = await startStripeCheckout(registration);
        window.location.assign(checkoutUrl);
      } catch (activationError) {
        setError(
          activationError instanceof Error
            ? activationError.message
            : "Unable to create your account.",
        );
      }
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
            <h2 className="text-lg font-semibold">Secure checkout</h2>
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-olea-green/20 bg-olea-light/50 p-5">
                <Lock className="size-6 text-olea-green" />
                <p className="mt-3 font-semibold text-olea-dark">
                  Payment is completed securely
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Olea Connects™ never receives or stores your card number or
                  security code.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Billing province</Label>
                <Select
                  value={registration.province}
                  onValueChange={(province) =>
                    updateRegistration({ province })
                  }
                >
                  <SelectTrigger
                    id="province"
                    className="h-11 w-full bg-white px-3.5 focus:ring-olea-green/20"
                  >
                    <SelectValue placeholder="Select a province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <h3 className="font-semibold text-olea-dark">Review & legal agreements</h3>
                <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-4"><dt>Organization</dt><dd className="font-medium text-slate-900">{registration.organizationName}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Plan</dt><dd className="font-medium text-slate-900">{plan.name}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Billing</dt><dd className="font-medium capitalize text-slate-900">{registration.billingCycle}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Included seats</dt><dd className="font-medium text-slate-900">{plan.seats}</dd></div>
                </dl>
                <div className="mt-4 space-y-3 border-t pt-4 text-sm text-slate-700">
                  <ConsentCheckbox
                    checked={registration.consents.terms}
                    onChange={(checked) => updateRegistration({ consents: { ...registration.consents, terms: checked } })}
                    document={LEGAL_DOCUMENTS.terms}
                  />
                  <ConsentCheckbox
                    checked={registration.consents.privacy}
                    onChange={(checked) => updateRegistration({ consents: { ...registration.consents, privacy: checked } })}
                    document={LEGAL_DOCUMENTS.privacy}
                  />
                  <ConsentCheckbox
                    checked={registration.consents.dataOwnership}
                    onChange={(checked) => updateRegistration({ consents: { ...registration.consents, dataOwnership: checked } })}
                    document={LEGAL_DOCUMENTS.dataOwnership}
                  />
                  <ConsentCheckbox
                    checked={registration.consents.confidentiality}
                    onChange={(checked) => updateRegistration({ consents: { ...registration.consents, confidentiality: checked } })}
                    document={LEGAL_DOCUMENTS.confidentiality}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={
                  !registration.email ||
                  registration.password.length < 8 ||
                  !allConsentsGranted ||
                  isPending
                }
                onClick={handlePayment}
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {isPending
                  ? "Opening secure checkout..."
                  : "Continue to secure checkout ->"}
              </Button>
              {error ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Lock className="size-3.5" /> Secure checkout
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
              {formatCad(price)}
              <span className="text-sm font-normal text-slate-400">
                /{billingPeriod}
              </span>
            </p>
            <p className="mt-1 text-xs font-semibold text-olea-green">
              Founding-member eligibility is confirmed securely before payment.
            </p>
            <div className="my-5 border-t" />
            <p className="font-semibold text-olea-dark">
              Membership starts immediately
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your selected annual or quarterly billing amount is charged
              upfront when you activate your membership. GST/PST is calculated
              from your billing province.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              <li>✓ 30-day notice before renewal</li>
              <li>✓ Prices in Canadian dollars</li>
              <li>✓ {plan.seats}</li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  document,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  document: { title: string; version: string; href: string };
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-olea-green"
      />
      <span>
        I agree to the{" "}
        <a
          className="font-semibold text-olea-green underline"
          href={document.href}
          target="_blank"
          rel="noreferrer"
        >
          {document.title}
        </a>{" "}
        <span className="text-xs text-slate-500">(version {document.version})</span>.
      </span>
    </label>
  );
}
