import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRequestLocale } from "@/lib/i18n/server";

import { TemplateSlugPage } from "../template-slug-page";

export default async function BoardSelfEvaluationPage() {
  const isFrench = (await getRequestLocale()) === "fr-CA";
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-700">
            {isFrench
              ? "Il s'agit d'une fiche individuelle à imprimer. Pour recueillir les réponses privées de plusieurs administrateurs et consulter les résultats annuels du conseil, utilisez l'évaluation annuelle du conseil."
              : "This is an individual printable worksheet. For private responses from several directors and shared annual results, use Annual Board Evaluation."}
          </p>
          <Button asChild variant="outline" className="shrink-0"><Link href="/modules/board-evaluation">{isFrench ? "Ouvrir l'évaluation annuelle" : "Open annual evaluation"}</Link></Button>
        </CardContent>
      </Card>
      <TemplateSlugPage slug="board-self-evaluation" />
    </div>
  );
}
