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
  confirmed?: string;
  done?: boolean;
  leadContact?: string;
  time?: string;
  location?: string;
  relatedMeeting?: string;
  responsible?: string;
  status?: string;
  notes?: string;
  virtualLink?: string;
  weeksBefore?: number;
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
        related_meeting: input.relatedMeeting?.trim() ?? "",
        responsible: input.responsible?.trim() || "Administrator",
        status: input.status || input.category || "Not Started",
        notes,
        done: input.done ?? false,
      };
    case "agm_milestone":
      return {
        track: input.category || "Governance",
        task: title,
        weeks_before: input.weeksBefore ?? 0,
        calculated_date: input.dateKey,
        responsible: input.responsible?.trim() || "Administrator",
        status: input.status || "Not Started",
        notes,
        done: input.done ?? false,
      };
    case "meeting":
    default:
      return {
        date: input.dateKey,
        type: input.category,
        committee: title,
        time: input.time?.trim() ?? "",
        location: input.location?.trim() ?? "",
        virtual_link: input.virtualLink?.trim() ?? "",
        lead_contact: input.leadContact?.trim() || "Administrator",
        notes,
        confirmed: input.confirmed || "TBC",
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

function getBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
        relatedMeeting: getString(row, "related_meeting"),
        responsible: getString(row, "responsible"),
        status: getString(row, "status") || "Not Started",
        notes: getString(row, "notes"),
        done: getBoolean(row, "done"),
      };
    case "agm_milestone":
      return {
        type: identity.type,
        dateKey: getString(row, "calculated_date"),
        title: getString(row, "task"),
        category: getString(row, "track") || "Governance",
        weeksBefore: getNumber(row, "weeks_before"),
        responsible: getString(row, "responsible"),
        status: getString(row, "status") || "Not Started",
        notes: getString(row, "notes"),
        done: getBoolean(row, "done"),
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
        virtualLink: getString(row, "virtual_link"),
        leadContact: getString(row, "lead_contact"),
        notes: getString(row, "notes"),
        confirmed: getString(row, "confirmed") || "TBC",
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
  return {
    ...existingRow,
    ...createBoardCalendarEntryRow(input),
  };
}

export function deleteBoardCalendarEntry(
  data: TemplateFormData,
  eventId: string,
): BoardCalendarEntryMutation | null {
  const identity = getBoardCalendarEntryIdentity(eventId);
  if (!identity) return null;

  const rows = getRows(data, identity.key);
  if (!rows[identity.index]) return null;

  return {
    path: [identity.key],
    value: rows.filter((_, index) => index !== identity.index),
  };
}
