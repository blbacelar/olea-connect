export const kpiDashboardTabs = [
  "board",
  "q1",
  "q2",
  "q3",
  "q4",
  "milestones",
  "annual",
  "setup",
  "settings",
] as const;

export type KpiDashboardTab = (typeof kpiDashboardTabs)[number];

function isKpiDashboardTab(value: string): value is KpiDashboardTab {
  return (kpiDashboardTabs as readonly string[]).includes(value);
}

export function resolveKpiDashboardTab(
  requestedTab: string | undefined,
  hasSavedSetup: boolean,
): KpiDashboardTab {
  if (!hasSavedSetup) return "setup";

  if (requestedTab && isKpiDashboardTab(requestedTab)) {
    return requestedTab;
  }

  return "setup";
}
