"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { acceptTeamInvitation } from "../../actions";

export function InvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const accept = () => {
    startTransition(async () => {
      try {
        setError("");
        await acceptTeamInvitation(token);
        setAccepted(true);
        router.refresh();
      } catch (acceptError) {
        setError(
          acceptError instanceof Error
            ? acceptError.message
            : "Unable to accept this invitation.",
        );
      }
    });
  };

  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center shadow-soft">
      <span className="mx-auto grid size-14 place-items-center rounded-xl bg-olea-light text-olea-green">
        <CheckCircle2 className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold">
        {accepted ? "Invitation accepted" : "Join the organization"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {accepted
          ? "Your team access is ready."
          : "Accept this invitation using the email address it was sent to."}
      </p>
      {error ? (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {accepted ? (
        <Button className="mt-6 w-full" onClick={() => router.push("/dashboard")}>
          Continue to dashboard
        </Button>
      ) : (
        <Button
          className="mt-6 w-full"
          disabled={!token || isPending}
          onClick={accept}
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending ? "Accepting..." : "Accept invitation"}
        </Button>
      )}
    </div>
  );
}
