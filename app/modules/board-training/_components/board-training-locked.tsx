import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TrainingLanguage } from "@/lib/board-training/content";

export function BoardTrainingLocked({ language }: { language: TrainingLanguage }) {
  const french = language === "fr";

  return (
    <div className="mx-auto max-w-3xl py-8 sm:py-16" data-testid="board-training-locked">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-5 p-8 sm:p-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-olea-light text-olea-dark">
            <BookOpen className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-olea-green">{french ? "Inclus avec Canopy" : "Included with Canopy"}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-teal-900">
              {french ? "Formation du conseil" : "Board Training"}
            </h1>
            <p className="max-w-xl text-slate-600">
              {french
                ? "Un abonnement Canopy actif est nécessaire pour utiliser ce module. Découvrez Canopy pour accéder aux cours, aux certificats et aux rapports de formation du conseil."
                : "An active Canopy subscription is required to use this module. Explore Canopy to access courses, certificates, and board training reports."}
            </p>
          </div>
          <Button asChild>
            <Link href="/subscription">
              {french ? "Voir l’abonnement Canopy" : "View Canopy plan"}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
