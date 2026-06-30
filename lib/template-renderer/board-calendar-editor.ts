import {
  addDays,
  isHexColor,
  monthNames,
  parseDateKey,
  toDateKey,
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
  daysBeforeAgm?: number;
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

export interface BoardCalendarSetup {
  administrator: string;
  administratorEmail: string;
  boardChair: string;
  committees: string[];
  executiveDirector: string;
  fiscalYear: string;
  operationalTaskRules: BoardCalendarTaskRule[];
  responsibleOptions: string[];
}

export interface BoardCalendarTaskRule {
  appliesTo: string;
  daysOffset: number;
  label: string;
  responsible: string;
}

export interface GeneratedStaffTaskRow {
  done: boolean;
  due_date: string;
  generated_key: string;
  notes: string;
  related_meeting: string;
  responsible: string;
  status: string;
  task: string;
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

function getNumberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function cleanList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getMeetingLabel(record: Record<string, unknown>) {
  const type = getString(record, "type") || "Meeting";
  const committee = getString(record, "committee");
  return committee ? `${type} - ${committee}` : type;
}

function getTaskGeneratedKey({
  meeting,
  rule,
}: {
  meeting: Record<string, unknown>;
  rule: BoardCalendarTaskRule;
}) {
  return [
    "meeting",
    getString(meeting, "date"),
    getString(meeting, "type"),
    getString(meeting, "committee"),
    rule.label,
    rule.daysOffset,
    rule.appliesTo,
  ].join(":");
}

function normalizeTaskRule(row: Record<string, unknown>): BoardCalendarTaskRule | null {
  const label =
    getString(row, "label") ||
    getString(row, "task") ||
    getString(row, "task_name");
  if (!label) return null;

  const daysBefore = getNumberFromUnknown(row.days_before);
  const daysAfter = getNumberFromUnknown(row.days_after);
  const legacyOffset = getNumberFromUnknown(row.days_offset);
  const daysOffset =
    daysBefore !== undefined
      ? -Math.abs(daysBefore)
      : daysAfter !== undefined
        ? Math.abs(daysAfter)
        : legacyOffset ?? 0;

  return {
    appliesTo:
      getString(row, "applies_to") ||
      getString(row, "meeting_type") ||
      "Any meeting",
    daysOffset,
    label,
    responsible: getString(row, "responsible") || "Administrator",
  };
}

export function buildBoardCalendarSetup(data: TemplateFormData): BoardCalendarSetup {
  const committees = getRows(data, "committees")
    .map((row) => getString(row, "name") || getString(row, "committee"))
    .filter(Boolean)
    .slice(0, 8);

  const administrator = getTopLevelString(data, "administrator");
  const administratorEmail = getTopLevelString(data, "administrator_email");
  const executiveDirector = getTopLevelString(data, "executive_director");
  const boardChair = getTopLevelString(data, "board_chair");
  const operationalTaskRules = getRows(data, "operational_task_rules")
    .map(normalizeTaskRule)
    .filter((rule): rule is BoardCalendarTaskRule => Boolean(rule));

  return {
    administrator,
    administratorEmail,
    boardChair,
    committees,
    executiveDirector,
    fiscalYear: getTopLevelString(data, "fiscal_year"),
    operationalTaskRules,
    responsibleOptions: cleanList([
      "Administrator",
      "Executive Director",
      "Board Chair",
      "Treasurer / Finance Chair",
      "Governance Chair",
      "Committee Chair",
      "Finance Staff",
      "External Auditor",
      "Legal Counsel",
      administrator,
      executiveDirector,
      boardChair,
      ...committees,
    ]),
  };
}

function getTopLevelString(data: TemplateFormData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

export function calculateAgmMilestoneDate(
  agmDateKey: string,
  daysBeforeAgm: number,
) {
  const agmDate = parseDateKey(agmDateKey);
  if (!agmDate || !Number.isFinite(daysBeforeAgm)) return "";

  return toDateKey(addDays(agmDate, -daysBeforeAgm));
}

export function buildGeneratedStaffTasks(
  data: TemplateFormData,
): GeneratedStaffTaskRow[] {
  const setup = buildBoardCalendarSetup(data);
  const existingTasks = getRows(data, "tasks");
  const existingByKey = new Map(
    existingTasks
      .map((task) => [getString(task, "generated_key"), task] as const)
      .filter(([key]) => Boolean(key)),
  );

  return getRows(data, "meetings").flatMap((meeting) => {
    const date = parseDateKey(meeting.date);
    if (!date) return [];

    const meetingType = getString(meeting, "type");
    const relatedMeeting = getMeetingLabel(meeting);

    return setup.operationalTaskRules
      .filter(
        (rule) =>
          rule.appliesTo === "Any meeting" ||
          !rule.appliesTo ||
          rule.appliesTo === meetingType,
      )
      .map((rule) => {
        const generatedKey = getTaskGeneratedKey({ meeting, rule });
        const existingTask = existingByKey.get(generatedKey);

        return {
          generated_key: generatedKey,
          task: rule.label,
          due_date: toDateKey(addDays(date, rule.daysOffset)),
          related_meeting: relatedMeeting,
          responsible:
            getString(existingTask ?? {}, "responsible") || rule.responsible,
          status: getString(existingTask ?? {}, "status") || "Not Started",
          notes: getString(existingTask ?? {}, "notes"),
          done: getBoolean(existingTask ?? {}, "done"),
        };
      });
  });
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
        days_before: input.daysBeforeAgm ?? (input.weeksBefore ?? 0) * 7,
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

export function upsertBoardCalendarCategoryColor(
  data: TemplateFormData,
  category: string,
  hexCode: string,
): BoardCalendarEntryMutation | null {
  const normalizedCategory = category.trim();
  const normalizedHexCode = hexCode.trim().toUpperCase();

  if (!normalizedCategory || !isHexColor(normalizedHexCode)) return null;

  const existingRows = getRows(data, "event_categories");
  const existingIndex = existingRows.findIndex(
    (row) => getString(row, "category").trim() === normalizedCategory,
  );

  if (
    existingIndex >= 0 &&
    getString(existingRows[existingIndex], "hex_code").toUpperCase() ===
      normalizedHexCode
  ) {
    return null;
  }

  if (existingIndex >= 0) {
    return {
      path: ["event_categories"],
      value: existingRows.map((row, index) =>
        index === existingIndex
          ? { ...row, category: normalizedCategory, hex_code: normalizedHexCode }
          : row,
      ),
    };
  }

  return {
    path: ["event_categories"],
    value: [
      ...existingRows,
      {
        category: normalizedCategory,
        hex_code: normalizedHexCode,
        used_for: "Set from calendar entry form",
      },
    ],
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
        daysBeforeAgm:
          getNumber(row, "days_before") ?? (getNumber(row, "weeks_before") ?? 0) * 7,
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
