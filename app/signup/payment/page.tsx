"use client";

import { CheckCircle2, Lock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
import type { LegalDocumentKey } from "@/lib/legal-documents";
import { getPlan } from "@/lib/plans";
import { formatCad } from "@/lib/pricing";
import type { CheckoutErrorCode } from "@/lib/stripe/checkout-errors";

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

type PaymentCopy = ReturnType<typeof getAuthFlowCopy>["signup"]["payment"];

function getCheckoutErrorCode(error: unknown): CheckoutErrorCode | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? (code as CheckoutErrorCode) : null;
}

function getLocalizedCheckoutError(error: unknown, copy: PaymentCopy) {
  const code = getCheckoutErrorCode(error);

  if (code === "account_state") return copy.errors.accountState;
  if (code === "checkout_rate_limited") return copy.errors.checkoutRateLimited;
  if (code === "checkout_unavailable") return copy.errors.checkoutUnavailable;
  if (code === "signup_validation") return copy.errors.signupValidation;

  return copy.fallbackError;
}

export default function SignupPaymentPage() {
  const router = useRouter();
  const { hydrated, registration, updateRegistration } = useRegistration();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const paymentCopy = authCopy.signup.payment;
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const plan = getPlan(registration.tier);
  const localizedPlan = publicCopy.pricing.plans[plan.id];
  const price =
    registration.billingCycle === "annual"
      ? plan.annualPrice
      : plan.quarterlyPrice;
  const billingPeriod =
    registration.billingCycle === "annual"
      ? publicCopy.pricing.perYear
      : publicCopy.pricing.perQuarter;
  const allConsentsGranted = Object.values(registration.consents).every(
    Boolean,
  );
  const accountDetailsComplete =
    registration.organizationName.trim().length >= 2 &&
    registration.fullName.trim().length >= 2 &&
    registration.email.trim().length > 0 &&
    registration.password.length >= 8 &&
    registration.organizationKind !== "" &&
    registration.annualBudgetRange !== "" &&
    registration.boardSizeRange !== "";

  useEffect(() => {
    if (hydrated && !accountDetailsComplete) {
      router.replace("/signup/account");
    }
  }, [accountDetailsComplete, hydrated, router]);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("payment") === "canceled"
    ) {
      setError(paymentCopy.canceled);
    }
  }, [paymentCopy.canceled]);

  const handlePayment = () => {
    if (!allConsentsGranted) {
      setError(paymentCopy.consentError);
      return;
    }
    startTransition(async () => {
      try {
        setError("");
        const checkoutUrl = await startStripeCheckout(registration);
        window.location.assign(checkoutUrl);
      } catch (activationError) {
        setError(getLocalizedCheckoutError(activationError, paymentCopy));
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader minimal />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <StepIndicator current={3} />
        <h1 className="mt-5 text-center text-3xl font-bold">
          {paymentCopy.title}
        </h1>
        <p className="mt-2 text-center text-slate-500">
          {authCopy.signup.step(3, 3)} · {paymentCopy.description}
        </p>

        <div className="mt-8 grid items-start gap-6 md:grid-cols-[1fr_360px]">
          <section className="rounded-[14px] border bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">
              {paymentCopy.secureCheckout}
            </h2>
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-olea-green/20 bg-olea-light/50 p-5">
                <Lock className="size-6 text-olea-green" />
                <p className="mt-3 font-semibold text-olea-dark">
                  {paymentCopy.paymentSecureTitle}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {paymentCopy.paymentSecureDescription}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">{paymentCopy.billingProvince}</Label>
                <Select
                  value={registration.province}
                  onValueChange={(province) => updateRegistration({ province })}
                >
                  <SelectTrigger
                    id="province"
                    className="h-11 w-full bg-white px-3.5 focus:ring-olea-green/20"
                  >
                    <SelectValue
                      placeholder={paymentCopy.provincePlaceholder}
                    />
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
                <h3 className="font-semibold text-olea-dark">
                  {paymentCopy.legalTitle}
                </h3>
                <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-4">
                    <dt>{paymentCopy.organization}</dt>
                    <dd className="font-medium text-slate-900">
                      {registration.organizationName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>{paymentCopy.plan}</dt>
                    <dd className="font-medium text-slate-900">
                      {localizedPlan.name}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>{paymentCopy.billing}</dt>
                    <dd className="font-medium text-slate-900">
                      {paymentCopy.billingCycle[registration.billingCycle]}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>{paymentCopy.includedSeats}</dt>
                    <dd className="font-medium text-slate-900">
                      {localizedPlan.seats}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 space-y-3 border-t pt-4 text-sm text-slate-700">
                  <ConsentCheckbox
                    checked={registration.consents.terms}
                    onChange={(checked) =>
                      updateRegistration({
                        consents: { ...registration.consents, terms: checked },
                      })
                    }
                    copy={paymentCopy}
                    document={LEGAL_DOCUMENTS.terms}
                    documentKey="terms"
                  />
                  <ConsentCheckbox
                    checked={registration.consents.privacy}
                    onChange={(checked) =>
                      updateRegistration({
                        consents: {
                          ...registration.consents,
                          privacy: checked,
                        },
                      })
                    }
                    copy={paymentCopy}
                    document={LEGAL_DOCUMENTS.privacy}
                    documentKey="privacy"
                  />
                  <ConsentCheckbox
                    checked={registration.consents.dataOwnership}
                    onChange={(checked) =>
                      updateRegistration({
                        consents: {
                          ...registration.consents,
                          dataOwnership: checked,
                        },
                      })
                    }
                    copy={paymentCopy}
                    document={LEGAL_DOCUMENTS.dataOwnership}
                    documentKey="dataOwnership"
                  />
                  <ConsentCheckbox
                    checked={registration.consents.confidentiality}
                    onChange={(checked) =>
                      updateRegistration({
                        consents: {
                          ...registration.consents,
                          confidentiality: checked,
                        },
                      })
                    }
                    copy={paymentCopy}
                    document={LEGAL_DOCUMENTS.confidentiality}
                    documentKey="confidentiality"
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
                  ? paymentCopy.continuePending
                  : paymentCopy.continueToCheckout}
              </Button>
              {error ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Lock className="size-3.5" /> {paymentCopy.secureCheckoutLabel}
              </p>
            </div>
          </section>

          <aside className="rounded-[14px] border bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
              {paymentCopy.orderSummary}
            </p>
            <h2 className="mt-4 text-xl font-bold">{localizedPlan.name}</h2>
            <p className="mt-1 text-slate-500">
              {paymentCopy.billingSummary(registration.billingCycle)}
            </p>
            <p className="mt-5 text-3xl font-bold">
              {formatCad(price, locale)}
              <span className="text-sm font-normal text-slate-400">
                /{billingPeriod}
              </span>
            </p>
            <p className="mt-1 text-xs font-semibold text-olea-green">
              {paymentCopy.foundingEligibility}
            </p>
            <div className="my-5 border-t" />
            <p className="font-semibold text-olea-dark">
              {paymentCopy.membershipStarts}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {paymentCopy.membershipDescription}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              {[
                paymentCopy.renewalNotice,
                paymentCopy.canadianDollars,
                localizedPlan.seats,
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-olea-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  copy,
  onChange,
  document,
  documentKey,
}: {
  checked: boolean;
  copy: ReturnType<typeof getAuthFlowCopy>["signup"]["payment"];
  onChange: (checked: boolean) => void;
  document: { title: string; version: string; href: string };
  documentKey: LegalDocumentKey;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        {copy.consentPrefix}{" "}
        <a
          className="font-semibold text-olea-green underline"
          href={document.href}
          target="_blank"
          rel="noreferrer"
        >
          {copy.legalDocuments[documentKey]}
        </a>{" "}
        <span className="text-xs text-slate-500">
          {copy.consentVersion(document.version)}
        </span>
        .
      </span>
    </label>
  );
}
