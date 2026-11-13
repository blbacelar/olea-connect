import "server-only";

import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";

export async function getStrategicBoardData() {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess) return { hasAccess: false, snapshots: [] };
  const { data, error } = await context.admin.from("strategic_workbook_snapshots")
    .select("id, title, summary, source_revision, created_at")
    .eq("organization_id", context.session.organization.id)
    .order("created_at", { ascending: false }).limit(40);
  if (error) throw error;
  return { hasAccess: true, snapshots: data ?? [] };
}
