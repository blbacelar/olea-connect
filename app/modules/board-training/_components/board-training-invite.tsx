"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptTrainingInvitationAction } from "@/app/modules/board-training/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainingLanguage } from "@/lib/board-training/content";

export function BoardTrainingInvite({ token, valid, language, organizationName }: {
  token: string; valid: boolean; language: TrainingLanguage; organizationName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const french = language === "fr";
  const description = valid
    ? french ? `${organizationName} vous invite à suivre la formation du conseil.` : `${organizationName} invites you to board training.`
    : french
      ? "Cette invitation n’est plus disponible pour ce compte. Vérifiez que vous utilisez le courriel invité ou demandez une nouvelle invitation à votre administrateur."
      : "This invitation is unavailable for this account. Check that you are signed in with the invited email, or ask your administrator for a new invitation.";
  return <Card className="mx-auto max-w-lg">
    <CardHeader><CardTitle>{french ? "Invitation à la formation du conseil" : "Board training invitation"}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm leading-6 text-slate-700">{description}</p>
      {message && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
      <div className="flex flex-wrap gap-3">
        {valid && <Button disabled={pending} onClick={() => startTransition(async () => {
          const result = await acceptTrainingInvitationAction(token);
          if (result.ok) router.push(`/modules/board-training/${result.value}`);
          else setMessage(result.error);
        })}>{french ? "Accepter l’invitation" : "Accept invitation"}</Button>}
        <Button asChild variant="outline"><Link href="/modules/board-training"><ArrowLeft className="mr-2 size-4" />{french ? "Retour à la formation" : "Back to board training"}</Link></Button>
      </div>
    </CardContent>
  </Card>;
}
