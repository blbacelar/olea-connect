"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { useRegistration } from "@/hooks/use-registration";
import { startStripeCheckout } from "@/lib/auth";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import type { CheckoutErrorCode } from "@/lib/stripe/checkout-errors";

import { PaymentCheckoutPanel, PaymentOrderSummary } from "./payment-sections";

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
          <PaymentCheckoutPanel
            allConsentsGranted={allConsentsGranted}
            copy={paymentCopy}
            error={error}
            isPending={isPending}
            publicCopy={publicCopy}
            registration={registration}
            onPayment={handlePayment}
            onUpdateRegistration={updateRegistration}
          />
          <PaymentOrderSummary
            copy={paymentCopy}
            locale={locale}
            publicCopy={publicCopy}
            registration={registration}
          />
        </div>
      </main>
    </div>
  );
}
