"use client";

import { AlertTriangle } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { getErrorBoundaryCopy } from "@/lib/i18n/error-boundary-copy";

export default function KpiDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useLocaleContext();
  const copy = getErrorBoundaryCopy(locale);

  return (
    <section role="alert" className="rounded-xl border border-red-200 bg-white p-8 shadow-soft">
      <AlertTriangle className="h-10 w-10 text-red-600" />
      <h1 className="mt-5 text-3xl font-bold text-slate-950">
        {copy.kpiDashboard.title}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        {copy.kpiDashboard.description}
      </p>
      <Button className="mt-6" onClick={reset} type="button">
        {copy.retry}
      </Button>
    </section>
  );
}
