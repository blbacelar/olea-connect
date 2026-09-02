"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/auth";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const updateCopy = authCopy.updatePassword;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const valid = password.length >= 8 && password === confirmation;

  const submit = () => {
    startTransition(async () => {
      try {
        setError("");
        await updatePassword(password);
        router.replace("/dashboard");
        router.refresh();
      } catch (updateError) {
        setError(updateCopy.fallbackError);
      }
    });
  };

  return (
    <AuthCard
      title={updateCopy.title}
      description={updateCopy.description}
      logo={publicCopy.logo}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="newPassword">{updateCopy.newPassword}</Label>
          <PasswordInput
            id="newPassword"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hideLabel={authCopy.shared.hidePassword}
            showLabel={authCopy.shared.showPassword}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{updateCopy.confirmPassword}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid) submit();
            }}
          />
        </div>
        {confirmation && password !== confirmation ? (
          <p className="text-sm text-red-600">{updateCopy.mismatch}</p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Button
          className="w-full"
          disabled={!valid || isPending}
          onClick={submit}
        >
          {isPending ? updateCopy.pending : updateCopy.submit}
        </Button>
      </div>
    </AuthCard>
  );
}
