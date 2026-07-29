"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function KpiDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-xl border border-red-200 bg-white p-8 shadow-soft">
      <AlertTriangle className="h-10 w-10 text-red-600" />
      <h1 className="mt-5 text-3xl font-bold text-slate-950">
        We could not load the KPI dashboard
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        The dashboard data request failed. Try again, and if it keeps happening,
        contact support so we can check the workspace configuration.
      </p>
      <Button className="mt-6" onClick={reset} type="button">
        Try again
      </Button>
    </section>
  );
}
