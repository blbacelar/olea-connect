import {
  monthNames,
  parseDateKey,
} from "@/lib/template-renderer/calendar-view";
import type {
  FieldPath,
  TemplateFormData,
  TemplateValue,
} from "@/lib/template-renderer/types";

export type BoardCalendarEntryType =
  | "meeting"
  | "annual_highlight"
  | "staff_task"
  | "agm_milestone";

export interface BoardCalendarEntryInput {
  type: BoardCalendarEntryType;
  dateKey: string;
  title: string;
  category: string;
  time?: string;
  location?: string;
  notes?: string;
}

export interface BoardCalendarEntryMutation {
  path: FieldPath;
  value: TemplateValue;
}

function getRows(data: TemplateFormData, key: string): Array<Record<string, unknown>> {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
}

function getMonthName(dateKey: string) {
  const date = parseDateKey(dateKey);
  return date ? monthNames[date.getMonth()] : "";
}

export function createBoardCalendarEntryRow(input: BoardCalendarEntryInput) {
  const title = input.title.trim();
  const notes = input.notes?.trim() ?? "";

  switch (input.type) {
    case "annual_highlight":
      return {
        month: getMonthName(input.dateKey),
        date: input.dateKey,
        title,
        category: input.category,
        notes,
      };
    case "staff_task":
      return {
        task: title,
        due_date: input.dateKey,
        related_meeting: notes,
        responsible: "Administrator",
        status: "Not Started",
      };
    case "agm_milestone":
      return {
        track: input.category || "Governance",
        task: title,
        weeks_before: 0,
        calculated_date: input.dateKey,
        responsible: "Administrator",
        status: "Not Started",
        notes,
      };
    case "meeting":
    default:
      return {
        date: input.dateKey,
        type: input.category,
        committee: title,
        time: input.time?.trim() ?? "",
        location: input.location?.trim() ?? "",
        virtual_link: "",
        lead_contact: "Administrator",
        notes,
        confirmed: "TBC",
      };
  }
}

export function getBoardCalendarEntryPath(type: BoardCalendarEntryType): FieldPath {
  switch (type) {
    case "annual_highlight":
      return ["annual_highlights"];
    case "staff_task":
      return ["tasks"];
    case "agm_milestone":
      return ["agm_milestones"];
    case "meeting":
    default:
      return ["meetings"];
  }
}

export function appendBoardCalendarEntry(
  data: TemplateFormData,
  input: BoardCalendarEntryInput,
): BoardCalendarEntryMutation {
  const [key] = getBoardCalendarEntryPath(input.type);
  const fieldKey = String(key);

  return {
    path: [fieldKey],
    value: [...getRows(data, fieldKey), createBoardCalendarEntryRow(input)],
  };
}
