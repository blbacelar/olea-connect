"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";

export default function ResetPasswordPage() {
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const resetCopy = authCopy.resetPassword;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      try {
        setError("");
        await requestPasswordReset(email);
        setSent(true);
      } catch (resetError) {
        setError(resetCopy.fallbackError);
      }
    });
  };

  return (
    <AuthCard
      title={sent ? resetCopy.sentTitle : resetCopy.title}
      logo={publicCopy.logo}
      description={
        sent ? resetCopy.sentDescription(email) : resetCopy.description
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <Button variant="outline" onClick={() => setSent(false)}>
            {resetCopy.sendAnother}
          </Button>
          <p>
            <Link
              href="/login"
              className="text-sm font-semibold text-olea-green"
            >
              {authCopy.shared.backToLogin}
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="resetEmail">{authCopy.shared.emailAddress}</Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button
            data-testid="send-reset-link"
            className="w-full"
            disabled={!/\S+@\S+\.\S+/.test(email) || isPending}
            onClick={submit}
          >
            {isPending ? resetCopy.pending : resetCopy.submit}
          </Button>
          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Link
            href="/login"
            className="block text-center text-sm font-medium text-slate-500"
          >
            {authCopy.shared.backToLogin}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
