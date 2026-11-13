import "server-only";

import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";
import { buildStrategicCalendarDates } from "@/lib/strategic-planning/calendar-dates";
import { parseWorkbookValues, type WorkbookValues } from "@/lib/strategic-planning/workbook";

export async function getStrategicCalendarDates() {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess) return [];
  const { data, error } = await context.admin.from("strategic_workbooks")
    .select("state").eq("organization_id", context.session.organization.id).maybeSingle();
  if (error) throw error;
  if (!data) return [];
  const values = parseWorkbookValues(data.state?.values ?? {}) as WorkbookValues;
  return buildStrategicCalendarDates(values);
}
