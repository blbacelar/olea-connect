import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { KpiDashboardWorkspace } from "@/app/modules/kpi-dashboard/_components/kpi-dashboard-workspace";
import { Button } from "@/components/ui/button";
import { getKpiDashboardData } from "@/lib/data/kpi-dashboard";

export const dynamic = "force-dynamic";

export default async function KpiDashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const data = await getKpiDashboardData();

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-gradient-to-br from-white to-olea-light/60 p-6 shadow-soft">
        <Button asChild className="mb-5 w-full sm:w-auto" variant="outline">
          <Link href="/templates">
            <ArrowLeft className="h-4 w-4" />
            Back to resources
          </Link>
        </Button>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-olea-green">
          Board reporting
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">
          KPI Dashboard and Board Reporting
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Define KPIs, customize reporting quarters, capture quarterly results,
          and prepare board-ready annual reporting from one connected workspace.
        </p>
      </section>

      <KpiDashboardWorkspace activeTab={searchParams?.tab ?? "setup"} data={data} />
    </div>
  );
}
