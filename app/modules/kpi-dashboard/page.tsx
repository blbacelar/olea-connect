import { KpiDashboardWorkspace } from "@/app/modules/kpi-dashboard/_components/kpi-dashboard-workspace";
import { resolveKpiDashboardTab } from "@/app/modules/kpi-dashboard/tab-state";
import { getKpiDashboardData } from "@/lib/data/kpi-dashboard";

export const dynamic = "force-dynamic";

export default async function KpiDashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const data = await getKpiDashboardData();
  const activeTab = resolveKpiDashboardTab(
    searchParams?.tab,
    Boolean(data.dashboard.financialYearEnd),
  );

  return <KpiDashboardWorkspace activeTab={activeTab} data={data} />;
}
