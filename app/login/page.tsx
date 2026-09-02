"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistration } from "@/hooks/use-registration";
import { signIn } from "@/lib/auth";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { retryMembershipActivation } from "@/lib/provisioning/client";

const DASHBOARD_PATH = "/dashboard";

function getSafePath(value: string | undefined, fallback = DASHBOARD_PATH) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { registration } = useRegistration();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const loginCopy = authCopy.login;
  const [email, setEmail] = useState(registration.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("");
  const [rememberFor30Days, setRememberFor30Days] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setError(searchParams.get("error") ? loginCopy.fallbackError : "");
    const paymentSucceeded = searchParams.get("payment") === "success";
    const needsEmailVerification = searchParams.get("verify") === "email";
    setMessage(
      needsEmailVerification
        ? loginCopy.paymentVerifyMessage
        : paymentSucceeded
          ? loginCopy.paymentSuccessMessage
          : "",
    );
    setNextPath(searchParams.get("next") || "");
  }, [
    loginCopy.fallbackError,
    loginCopy.paymentSuccessMessage,
    loginCopy.paymentVerifyMessage,
  ]);

  const handleLogin = () => {
    startTransition(async () => {
      try {
        setError("");
        await signIn(email, password, { rememberFor30Days });
        try {
          const { response, result } = await retryMembershipActivation();
          if (response.ok && result.status === "completed") {
            router.push(getSafePath(result.nextPath));
            router.refresh();
            return;
          }
        } catch {
          // A recovery check should never block a successful sign-in.
        }
        router.push(getSafePath(nextPath));
        router.refresh();
      } catch {
        setError(loginCopy.fallbackError);
      }
    });
  };

  return (
    <AuthCard title={loginCopy.title} logo={publicCopy.logo}>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="loginEmail">{authCopy.shared.emailAddress}</Label>
          <Input
            id="loginEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="loginPassword">{loginCopy.password}</Label>
            <Link
              href="/reset-password"
              className="text-xs font-semibold text-olea-green"
            >
              {loginCopy.forgotPassword}
            </Link>
          </div>
          <PasswordInput
            id="loginPassword"
            value={password}
            hideLabel={authCopy.shared.hidePassword}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleLogin();
            }}
            showLabel={authCopy.shared.showPassword}
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
          <Checkbox
            id="rememberFor30Days"
            checked={rememberFor30Days}
            onChange={(event) => setRememberFor30Days(event.target.checked)}
          />
          <span>{loginCopy.remember}</span>
        </label>
        <Button className="w-full" disabled={isPending} onClick={handleLogin}>
          {isPending ? loginCopy.pending : loginCopy.submit}
        </Button>
        <p className="text-center text-sm text-slate-500">
          {loginCopy.noAccount}{" "}
          <Link href="/signup" className="font-semibold text-olea-green">
            {loginCopy.signUp}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
