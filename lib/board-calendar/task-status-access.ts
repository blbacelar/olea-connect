import { isDeepStrictEqual } from "node:util";

import type { TemplateFormData } from "@/lib/template-renderer/types";

const allowedStatuses = new Set(["Not Started", "In Progress", "Complete"]);

export function isTaskStatusOnlyChange(before: TemplateFormData, after: TemplateFormData) {
  const withoutTasks = (data: TemplateFormData) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => key !== "tasks"));
  if (!isDeepStrictEqual(withoutTasks(before), withoutTasks(after))) return false;
  const beforeTasks = before.tasks;
  const afterTasks = after.tasks;
  if (!Array.isArray(beforeTasks) || !Array.isArray(afterTasks)
    || beforeTasks.length !== afterTasks.length) return false;
  return beforeTasks.every((previous, index) => {
    const next = afterTasks[index];
    if (!previous || !next || typeof previous !== "object" || typeof next !== "object"
      || Array.isArray(previous) || Array.isArray(next)) return false;
    const previousRow = previous as Record<string, unknown>;
    const nextRow = next as Record<string, unknown>;
    return (isDeepStrictEqual(previousRow.status, nextRow.status)
        || allowedStatuses.has(String(nextRow.status)))
      && isDeepStrictEqual(
        Object.fromEntries(Object.entries(previousRow).filter(([key]) => key !== "status")),
        Object.fromEntries(Object.entries(nextRow).filter(([key]) => key !== "status")),
      );
  });
}
