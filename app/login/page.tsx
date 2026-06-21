"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistration } from "@/hooks/use-registration";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { registration } = useRegistration();
  const [email, setEmail] = useState(registration.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setError(searchParams.get("error") || "");
    const paymentSucceeded = searchParams.get("payment") === "success";
    const needsEmailVerification = searchParams.get("verify") === "email";
    setMessage(
      needsEmailVerification
        ? "Payment received. Check your inbox for a confirmation email from Olea Connects, confirm your address, then sign in."
        : paymentSucceeded
          ? "Payment received. Sign in to finish setting up your membership."
          : "",
    );
    setNextPath(searchParams.get("next") || "");
  }, []);

  const handleLogin = () => {
    startTransition(async () => {
      try {
        setError("");
        await signIn(email, password);
        router.push(
          nextPath.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : "/dashboard",
        );
        router.refresh();
      } catch (loginError) {
        setError(
          loginError instanceof Error
            ? loginError.message
            : "Unable to sign in.",
        );
      }
    });
  };

  return (
    <AuthCard title="Welcome back">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="loginEmail">Email address</Label>
          <Input
            id="loginEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="loginPassword">Password</Label>
            <Link
              href="/reset-password"
              className="text-xs font-semibold text-olea-green"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="loginPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleLogin();
            }}
          />
        </div>
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" className="size-4 accent-olea-green" />
          Remember me for 30 days
        </label>
        <Button
          className="w-full"
          disabled={isPending}
          onClick={handleLogin}
        >
          {isPending ? "Signing in..." : "Sign in →"}
        </Button>
        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-olea-green">
            Sign up →
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
