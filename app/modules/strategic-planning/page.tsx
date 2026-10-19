import { StrategicPlanningWorkspace } from "./strategic-planning-workspace";
import { getStrategicPlanningData } from "@/lib/data/strategic-planning";

export const dynamic = "force-dynamic";

export default async function StrategicPlanningPage() {
  const data = await getStrategicPlanningData();
  return <StrategicPlanningWorkspace data={data} />;
}
