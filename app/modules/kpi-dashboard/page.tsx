import { KpiDashboardWorkspace } from "@/app/modules/kpi-dashboard/_components/kpi-dashboard-workspace";
import { getKpiDashboardData } from "@/lib/data/kpi-dashboard";

export const dynamic = "force-dynamic";

export default async function KpiDashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const data = await getKpiDashboardData();

  return <KpiDashboardWorkspace activeTab={searchParams?.tab ?? "setup"} data={data} />;
}
