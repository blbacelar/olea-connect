"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth";

export default function ResetPasswordPage() {
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
        setError(
          resetError instanceof Error
            ? resetError.message
            : "Unable to send the reset link.",
        );
      }
    });
  };

  return (
    <AuthCard
      title={sent ? "Check your email" : "Reset your password"}
      description={
        sent
          ? `If an account exists for ${email}, a reset link is on its way.`
          : "Enter your email and we'll send a secure reset link."
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <Button variant="outline" onClick={() => setSent(false)}>
            Send another link
          </Button>
          <p>
            <Link href="/login" className="text-sm font-semibold text-olea-green">
              Back to login
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="resetEmail">Email address</Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!/\S+@\S+\.\S+/.test(email) || isPending}
            onClick={submit}
          >
            {isPending ? "Sending..." : "Send reset link"}
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
            ← Back to login
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
