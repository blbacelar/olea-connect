"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { useRegistration } from "@/hooks/use-registration";
import {
  resendVerificationEmail,
} from "@/lib/auth";

export default function VerifyEmailPage() {
  const { registration } = useRegistration();
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
        setMessage("A new verification email has been sent.");
      } catch (resendError) {
        setMessage(
          resendError instanceof Error
            ? resendError.message
            : "Unable to resend the verification email.",
        );
      }
    });
  };

  return (
    <AuthCard
      title="Check your email"
      description={`We sent a verification link to ${
        registration.email || "your email address"
      }.`}
    >
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-olea-light text-olea-green">
          <MailCheck className="size-8" />
        </span>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          {paymentComplete
            ? "Your payment was received. Confirm your email before accessing the dashboard."
            : "Confirm your email before accessing the dashboard."}{" "}
          The secure link will return you to Olea Connects™ and continue setup
          automatically.
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
          {cooldown > 0
            ? `Resend available in ${cooldown}s`
            : "Resend verification email"}
        </button>
      </div>
    </AuthCard>
  );
}
