export const boardCalendarModule = {
  path: "/modules/board-calendar",
  resourceSlug: "board-calendar-operational-workflow",
} as const;

export const kpiDashboardModule = {
  path: "/modules/kpi-dashboard",
  resourceSlug: "kpi-dashboard-board-reporting",
} as const;

const modulePathByResourceSlug = new Map<string, string>([
  [boardCalendarModule.resourceSlug, boardCalendarModule.path],
  [kpiDashboardModule.resourceSlug, kpiDashboardModule.path],
]);

export function getResourceHref(resourceSlug: string) {
  return modulePathByResourceSlug.get(resourceSlug) ?? `/templates/${resourceSlug}`;
}
