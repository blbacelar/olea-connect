"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { useRegistration } from "@/hooks/use-registration";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { resendVerificationEmail } from "@/lib/auth";

export default function VerifyEmailPage() {
  const { registration } = useRegistration();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const verifyCopy = authCopy.verifyEmail;
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    setPaymentComplete(
      new URLSearchParams(window.location.search).get("payment") === "success",
    );
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => value - 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resend = () => {
    startTransition(async () => {
      try {
        setMessage("");
        await resendVerificationEmail(registration.email);
        setCooldown(60);
        setMessage(verifyCopy.sentMessage);
      } catch (resendError) {
        setMessage(verifyCopy.fallbackError);
      }
    });
  };

  return (
    <AuthCard
      title={verifyCopy.title}
      description={verifyCopy.description(
        registration.email || verifyCopy.fallbackEmail,
      )}
      logo={publicCopy.logo}
    >
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-olea-light text-olea-green">
          <MailCheck className="size-8" />
        </span>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          {paymentComplete
            ? verifyCopy.paymentMessage
            : verifyCopy.defaultMessage}{" "}
          {verifyCopy.returnMessage}
        </p>
        {message ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {message}
          </p>
        ) : null}
        <button
          disabled={cooldown > 0 || isPending}
          onClick={resend}
          className="mt-6 text-sm font-semibold text-olea-green disabled:text-slate-400"
        >
          {cooldown > 0 ? verifyCopy.resendIn(cooldown) : verifyCopy.resend}
        </button>
      </div>
    </AuthCard>
  );
}
