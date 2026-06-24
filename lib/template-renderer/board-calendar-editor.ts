import {
  monthNames,
  parseDateKey,
} from "@/lib/template-renderer/calendar-view";
import { toCalendarTimeInputValue } from "@/lib/template-renderer/calendar-time";
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

interface BoardCalendarEntryIdentity {
  index: number;
  key: string;
  type: BoardCalendarEntryType;
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

export function getBoardCalendarEntryIdentity(
  eventId: string,
): BoardCalendarEntryIdentity | null {
  const match = eventId.match(/^(meeting|annual|task|agm)-(\d+)$/);
  if (!match) return null;

  const source = match[1];
  const index = Number(match[2]);
  if (!Number.isInteger(index) || index < 0) return null;

  switch (source) {
    case "annual":
      return { index, key: "annual_highlights", type: "annual_highlight" };
    case "task":
      return { index, key: "tasks", type: "staff_task" };
    case "agm":
      return { index, key: "agm_milestones", type: "agm_milestone" };
    case "meeting":
    default:
      return { index, key: "meetings", type: "meeting" };
  }
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function getBoardCalendarEntryInput(
  data: TemplateFormData,
  eventId: string,
): BoardCalendarEntryInput | null {
  const identity = getBoardCalendarEntryIdentity(eventId);
  if (!identity) return null;

  const row = getRows(data, identity.key)[identity.index];
  if (!row) return null;

  switch (identity.type) {
    case "annual_highlight":
      return {
        type: identity.type,
        dateKey: getString(row, "date"),
        title: getString(row, "title"),
        category: getString(row, "category") || "Key Deadline",
        notes: getString(row, "notes"),
      };
    case "staff_task":
      return {
        type: identity.type,
        dateKey: getString(row, "due_date"),
        title: getString(row, "task"),
        category: getString(row, "status") || "Not Started",
        notes: getString(row, "related_meeting"),
      };
    case "agm_milestone":
      return {
        type: identity.type,
        dateKey: getString(row, "calculated_date"),
        title: getString(row, "task"),
        category: getString(row, "track") || "Governance",
        notes: getString(row, "notes"),
      };
    case "meeting":
    default:
      return {
        type: identity.type,
        dateKey: getString(row, "date"),
        title: getString(row, "committee") || getString(row, "type"),
        category: getString(row, "type") || "Board Meeting",
        time: toCalendarTimeInputValue(getString(row, "time")),
        location: getString(row, "location"),
        notes: getString(row, "notes"),
      };
  }
}

export function updateBoardCalendarEntry(
  data: TemplateFormData,
  eventId: string,
  input: BoardCalendarEntryInput,
): BoardCalendarEntryMutation | null {
  const identity = getBoardCalendarEntryIdentity(eventId);
  if (!identity) return null;

  const rows = getRows(data, identity.key);
  const existingRow = rows[identity.index];
  if (!existingRow) return null;

  return {
    path: [identity.key],
    value: rows.map((row, index) =>
      index === identity.index
        ? createUpdatedBoardCalendarEntryRow(row, {
            ...input,
            type: identity.type,
          })
        : row,
    ),
  };
}

function createUpdatedBoardCalendarEntryRow(
  existingRow: Record<string, unknown>,
  input: BoardCalendarEntryInput,
) {
  const nextRow = {
    ...existingRow,
    ...createBoardCalendarEntryRow(input),
  };

  switch (input.type) {
    case "meeting":
      return {
        ...nextRow,
        virtual_link: getString(existingRow, "virtual_link"),
        lead_contact:
          getString(existingRow, "lead_contact") ||
          getString(nextRow, "lead_contact"),
        confirmed:
          getString(existingRow, "confirmed") || getString(nextRow, "confirmed"),
      };
    case "staff_task":
      return {
        ...nextRow,
        responsible:
          getString(existingRow, "responsible") ||
          getString(nextRow, "responsible"),
      };
    case "agm_milestone":
      return {
        ...nextRow,
        weeks_before: existingRow.weeks_before ?? nextRow.weeks_before,
        responsible:
          getString(existingRow, "responsible") ||
          getString(nextRow, "responsible"),
        status: getString(existingRow, "status") || getString(nextRow, "status"),
      };
    case "annual_highlight":
    default:
      return nextRow;
  }
}
