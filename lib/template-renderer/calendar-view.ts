import type { TemplateFormData } from "./types";
import {
  formatCalendarTime,
  parseCalendarTimeToMinutes,
} from "./calendar-time";

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const boardCalendarCategoryColorDefaults: Record<string, string> = {
  "Board Meeting": "#1A6B6B",
  "Committee Meeting": "#4A3580",
  "AGM / Annual Meeting": "#C47D00",
  "Key Deadline": "#C0392B",
  Governance: "#0F766E",
  Event: "#7C3AED",
  Finance: "#2563EB",
  Compliance: "#B45309",
  "Other / General": "#5F5E5A",
  Complete: "#3F8054",
  "In Progress": "#C47D00",
  "Not Started": "#64748B",
};

export interface CalendarViewEvent {
  id: string;
  title: string;
  date: Date | null;
  dateKey: string | null;
  monthIndex: number | null;
  category: string;
  color: string;
  source: "meeting" | "annual" | "task" | "agm";
  time?: string;
  location?: string;
  notes?: string;
}

export interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
}

type TemplateRecord = Record<string, unknown>;

function isRecord(value: unknown): value is TemplateRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRecordArray(data: TemplateFormData, key: string): TemplateRecord[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(isRecord);
}

function getString(record: TemplateRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function getTopLevelString(data: TemplateFormData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function parseDateKey(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthIndex(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  const index = monthNames.findIndex(
    (month) => month.toLowerCase() === normalized,
  );
  return index >= 0 ? index : null;
}

export function getTemplateYear(data: TemplateFormData) {
  const configuredYear =
    getTopLevelString(data, "monthly_calendar_year") ||
    getTopLevelString(data, "fiscal_year");
  const parsedYear = Number.parseInt(configuredYear, 10);
  return Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
}

export function getTemplateMonthIndex(data: TemplateFormData) {
  return getMonthIndex(data.monthly_calendar_month) ?? new Date().getMonth();
}

export function buildCategoryColors(data: TemplateFormData) {
  const categoryColors = new Map<string, string>(
    Object.entries(boardCalendarCategoryColorDefaults),
  );

  getRecordArray(data, "event_categories").forEach((record) => {
    const category = getString(record, "category");
    const hexCode = getString(record, "hex_code");
    if (category && isHexColor(hexCode)) {
      categoryColors.set(category, hexCode.toUpperCase());
    }
  });

  return categoryColors;
}

function colorForCategory(
  categoryColors: Map<string, string>,
  category: string,
) {
  return (
    categoryColors.get(category) ??
    boardCalendarCategoryColorDefaults[category] ??
    boardCalendarCategoryColorDefaults["Other / General"]
  );
}

function createEvent(
  categoryColors: Map<string, string>,
  input: Omit<CalendarViewEvent, "color">,
): CalendarViewEvent {
  return {
    ...input,
    color: colorForCategory(categoryColors, input.category),
  };
}

export function buildCalendarEvents(data: TemplateFormData) {
  const categoryColors = buildCategoryColors(data);
  const events: CalendarViewEvent[] = [];

  getRecordArray(data, "meetings").forEach((record, index) => {
    const date = parseDateKey(record.date);
    const category = getString(record, "type") || "Other / General";
    const committee = getString(record, "committee");
    const notes = getString(record, "notes");
    const title = committee ? `${category} - ${committee}` : category;

    events.push(
      createEvent(categoryColors, {
        id: `meeting-${index}`,
        title,
        date,
        dateKey: date ? toDateKey(date) : null,
        monthIndex: date?.getMonth() ?? null,
        category,
        source: "meeting",
        time: formatCalendarTime(getString(record, "time")),
        location: getString(record, "location"),
        notes,
      }),
    );
  });

  getRecordArray(data, "annual_highlights").forEach((record, index) => {
    const date = parseDateKey(record.date);
    const category = getString(record, "category") || "Key Deadline";
    const monthIndex = date?.getMonth() ?? getMonthIndex(record.month);

    events.push(
      createEvent(categoryColors, {
        id: `annual-${index}`,
        title: getString(record, "title") || category,
        date,
        dateKey: date ? toDateKey(date) : null,
        monthIndex,
        category,
        source: "annual",
        notes: getString(record, "notes"),
      }),
    );
  });

  getRecordArray(data, "tasks").forEach((record, index) => {
    const date = parseDateKey(record.due_date);
    const category = getString(record, "status") || "Key Deadline";

    events.push(
      createEvent(categoryColors, {
        id: `task-${index}`,
        title: getString(record, "task") || "Task",
        date,
        dateKey: date ? toDateKey(date) : null,
        monthIndex: date?.getMonth() ?? null,
        category,
        source: "task",
        notes: getString(record, "related_meeting"),
      }),
    );
  });

  getRecordArray(data, "agm_milestones").forEach((record, index) => {
    const date = parseDateKey(record.calculated_date);
    const category = getString(record, "track") || "AGM / Annual Meeting";

    events.push(
      createEvent(categoryColors, {
        id: `agm-${index}`,
        title: getString(record, "task") || "AGM milestone",
        date,
        dateKey: date ? toDateKey(date) : null,
        monthIndex: date?.getMonth() ?? null,
        category,
        source: "agm",
        notes: getString(record, "notes"),
      }),
    );
  });

  return events.sort((left, right) => {
    if (!left.dateKey && !right.dateKey) {
      return left.title.localeCompare(right.title);
    }
    if (!left.dateKey) return 1;
    if (!right.dateKey) return -1;
    const dateOrder = left.dateKey.localeCompare(right.dateKey);
    if (dateOrder !== 0) return dateOrder;

    const leftTime = parseCalendarTimeToMinutes(left.time);
    const rightTime = parseCalendarTimeToMinutes(right.time);
    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    if (leftTime !== null) return -1;
    if (rightTime !== null) return 1;

    return left.title.localeCompare(right.title);
  });
}

export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

export function getWeekDays(anchorDate: Date) {
  const start = addDays(anchorDate, -anchorDate.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function groupEventsByDate(events: CalendarViewEvent[]) {
  return events.reduce<Map<string, CalendarViewEvent[]>>((grouped, event) => {
    if (!event.dateKey) return grouped;
    const eventsForDate = grouped.get(event.dateKey) ?? [];
    eventsForDate.push(event);
    grouped.set(event.dateKey, eventsForDate);
    return grouped;
  }, new Map());
}
