export const boardCalendarModule = {
  path: "/modules/board-calendar",
  resourceSlug: "board-calendar-operational-workflow",
} as const;

export const kpiDashboardModule = {
  path: "/modules/kpi-dashboard",
  resourceSlug: "kpi-dashboard-board-reporting",
} as const;

export const accreditationModule = {
  path: "/modules/accreditation",
  resourceSlug: "imagine-canada-accreditation-prep",
} as const;

export const grantPlatformModule = {
  path: "/modules/grant-platform",
  resourceSlug: "grant-platform",
} as const;

const modulePathByResourceSlug = new Map<string, string>([
  [boardCalendarModule.resourceSlug, boardCalendarModule.path],
  [kpiDashboardModule.resourceSlug, kpiDashboardModule.path],
  [accreditationModule.resourceSlug, accreditationModule.path],
  [grantPlatformModule.resourceSlug, grantPlatformModule.path],
]);

export function getResourceHref(resourceSlug: string) {
  return modulePathByResourceSlug.get(resourceSlug) ?? `/templates/${resourceSlug}`;
}
