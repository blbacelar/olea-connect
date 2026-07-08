export const boardCalendarModule = {
  path: "/modules/board-calendar",
  resourceSlug: "board-calendar-operational-workflow",
} as const;

const modulePathByResourceSlug = new Map<string, string>([
  [boardCalendarModule.resourceSlug, boardCalendarModule.path],
]);

export function getResourceHref(resourceSlug: string) {
  return modulePathByResourceSlug.get(resourceSlug) ?? `/templates/${resourceSlug}`;
}
