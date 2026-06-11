"use client";

import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { useRegistration } from "@/hooks/use-registration";
import {
  confirmEmailVerification,
  resendVerificationEmail,
} from "@/lib/auth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { registration, updateRegistration } = useRegistration();
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => value - 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const verify = () => {
    startTransition(async () => {
      await confirmEmailVerification();
      updateRegistration({ emailVerified: true });
      router.push("/onboarding/brand-setup");
    });
  };

  const resend = () => {
    startTransition(async () => {
      await resendVerificationEmail(registration.email);
      setCooldown(60);
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
          Confirm your email before accessing the dashboard. In this demo,
          the button below simulates clicking the secure email link.
        </p>
        <Button className="mt-6 w-full" disabled={isPending} onClick={verify}>
          {isPending ? "Verifying..." : "Verify email and continue"}
        </Button>
        <button
          disabled={cooldown > 0 || isPending}
          onClick={resend}
          className="mt-4 text-sm font-semibold text-olea-green disabled:text-slate-400"
        >
          {cooldown > 0
            ? `Resend available in ${cooldown}s`
            : "Resend verification email"}
        </button>
      </div>
    </AuthCard>
  );
}
