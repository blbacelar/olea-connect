import { isDeepStrictEqual } from "node:util";

import type { BoardCalendarRole } from "./access";
import { isTaskStatusOnlyChange } from "./task-status-access";
import { projectBoardCalendarForRole } from "@/lib/template-renderer/board-calendar-member-view";
import type { TemplateFormData } from "@/lib/template-renderer/types";

function withoutEditableFields(data: TemplateFormData, keys: readonly string[]) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !keys.includes(key)));
}

/** Validate only fields this role received, then merge authorized edits with the full persisted record. */
export function mergeBoardCalendarScopedWrite(
  before: TemplateFormData,
  submitted: TemplateFormData,
  role: BoardCalendarRole,
  defaults: TemplateFormData = {},
): TemplateFormData {
  const visibleBefore = projectBoardCalendarForRole({ ...defaults, ...before }, role);
  if (role === "chair") {
    if (!isDeepStrictEqual(
      withoutEditableFields(visibleBefore, ["meeting_documents", "documents"]),
      withoutEditableFields(submitted, ["meeting_documents", "documents"]),
    )) {
      throw new Error("Committee Chairs may edit meeting documents and package files only.");
    }
    return {
      ...before,
      meeting_documents: submitted.meeting_documents ?? [],
      documents: submitted.documents ?? [],
    };
  }
  if (role === "executive") {
    if (!isTaskStatusOnlyChange(visibleBefore, submitted)) {
      throw new Error("Executive Directors may update workflow task status only.");
    }
    return { ...before, tasks: submitted.tasks ?? [] };
  }
  throw new Error("This Board Calendar role can view the calendar but cannot edit it.");
}
