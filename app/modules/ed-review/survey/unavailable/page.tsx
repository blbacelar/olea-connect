import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";

const unavailableCopy: Record<
  Locale,
  { title: string; description: string; returnLink: string }
> = {
  "en-CA": {
    title: "Survey link unavailable",
    description:
      "This anonymous feedback link may be closed, expired, or no longer active. Ask the person who shared it with you for a current link.",
    returnLink: "Return to Olea Connects™",
  },
  "fr-CA": {
    title: "Lien de sondage non disponible",
    description:
      "Ce lien de rétroaction anonyme peut être fermé, expiré ou ne plus être actif. Demandez un lien à jour à la personne qui l'a partagé avec vous.",
    returnLink: "Retour à Olea Connects™",
  },
};

export default function UnavailableEdReviewSurveyPage() {
  const copy = unavailableCopy[getRequestLocale()];

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <AlertCircle className="size-10 text-amber-600" aria-hidden="true" />
          <CardTitle className="mt-3 text-2xl">
            {copy.title}
          </CardTitle>
          <CardDescription className="text-base leading-7">
            {copy.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">{copy.returnLink}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
