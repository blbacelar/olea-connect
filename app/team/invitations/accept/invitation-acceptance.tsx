"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getInvitationAcceptPath } from "@/lib/team/invitation-path";
import { nonEmptyTextSchema } from "@/lib/validation/schemas";
import { createClient } from "@/utils/supabase/client";

import { acceptTeamInvitation } from "../../actions";

type InvitationAcceptanceProps = {
  token: string;
  invitationEmail: string | null;
  signedInEmail: string | null;
};

export function InvitationAcceptance({
  token,
  invitationEmail,
  signedInEmail,
}: InvitationAcceptanceProps) {
  const router = useRouter();
  const { locale } = useLocaleContext();
  const authCopy = getAuthFlowCopy(locale);
  const invitationCopy = authCopy.invitation;
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const normalizedSignedInEmail = signedInEmail?.trim().toLowerCase() ?? null;
  const signedInWithInvitationEmail =
    normalizedSignedInEmail === invitationEmail?.trim().toLowerCase();
  const invitationPath = getInvitationAcceptPath(token);
  const invitedEmail = invitationEmail ?? "";

  const accept = () => {
    startTransition(async () => {
      try {
        setError("");
        await acceptTeamInvitation(token);
        setAccepted(true);
        router.refresh();
      } catch {
        setError(invitationCopy.fallbackAcceptError);
      }
    });
  };

  const register = () => {
    startTransition(async () => {
      setError("");
      setConfirmationRequired(false);
      const parsedName = nonEmptyTextSchema(160, 2).safeParse(fullName);
      if (!parsedName.success) {
        setError(invitationCopy.fullNameRequired);
        return;
      }

      if (password.length < 8) {
        setError(invitationCopy.passwordTooShort);
        return;
      }

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", invitationPath);
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitedEmail,
        password,
        options: {
          data: { full_name: parsedName.data },
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (signUpError) {
        setError(invitationCopy.createAccountError);
        return;
      }

      if (!data.user || data.user.identities?.length === 0) {
        setError(invitationCopy.accountExists);
        return;
      }

      // The confirmation link returns to this exact invitation. Acceptance is
      // still protected by the server-side token, email, and confirmation checks.
      setConfirmationRequired(true);
    });
  };

  if (!invitationEmail) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-red-50 text-red-700">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">
          {invitationCopy.unavailableTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {invitationCopy.unavailableDescription}
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/login">{invitationCopy.goToSignIn}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center shadow-soft">
      <span className="mx-auto grid size-14 place-items-center rounded-xl bg-olea-light text-olea-green">
        <CheckCircle2 className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold">
        {accepted ? invitationCopy.acceptedTitle : invitationCopy.joinTitle}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {accepted
          ? invitationCopy.acceptedDescription
          : invitationCopy.sentTo(invitationEmail)}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {accepted ? (
        <Button
          className="mt-6 w-full"
          onClick={() => router.push("/dashboard")}
        >
          {invitationCopy.continueToDashboard}
        </Button>
      ) : confirmationRequired ? (
        <div className="mt-6 rounded-lg bg-olea-light p-4 text-left text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-900">
            {invitationCopy.confirmEmailTitle}
          </p>
          <p className="mt-1">{invitationCopy.confirmEmailDescription}</p>
        </div>
      ) : !signedInEmail ? (
        <div className="mt-6 space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="invited-full-name">{invitationCopy.fullName}</Label>
            <Input
              id="invited-full-name"
              autoComplete="name"
              maxLength={160}
              value={fullName}
              onChange={(event) => setFullName(event.currentTarget.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invited-email">{invitationCopy.invitedEmail}</Label>
            <Input
              id="invited-email"
              readOnly
              value={invitationEmail}
              autoComplete="email"
            />
            <p className="text-xs leading-5 text-slate-500">
              {invitationCopy.invitedEmailHelp}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invited-password">
              {invitationCopy.createPassword}
            </Label>
            <PasswordInput
              id="invited-password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              hideLabel={authCopy.shared.hidePassword}
              showLabel={authCopy.shared.showPassword}
            />
            <p className="text-xs text-slate-500">
              {invitationCopy.passwordHelp}
            </p>
          </div>
          <Button
            className="w-full"
            data-testid="create-invited-account"
            disabled={
              isPending || fullName.trim().length < 2 || password.length < 8
            }
            onClick={register}
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {isPending
              ? invitationCopy.createPending
              : invitationCopy.createSubmit}
          </Button>
          <p className="text-center text-sm text-slate-500">
            {invitationCopy.alreadyHaveAccount}{" "}
            <Link
              className="font-semibold text-olea-green hover:underline"
              href={`/login?next=${encodeURIComponent(invitationPath)}`}
            >
              {invitationCopy.signIn}
            </Link>
          </p>
        </div>
      ) : !signedInWithInvitationEmail ? (
        <div
          data-testid="invitation-wrong-account"
          className="mt-6 rounded-lg bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900"
        >
          {invitationCopy.wrongAccount(invitationEmail)}
        </div>
      ) : (
        <Button
          className="mt-6 w-full"
          data-testid="accept-team-invitation"
          disabled={!token || isPending}
          onClick={accept}
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending
            ? invitationCopy.acceptPending
            : invitationCopy.acceptSubmit}
        </Button>
      )}
    </div>
  );
}
