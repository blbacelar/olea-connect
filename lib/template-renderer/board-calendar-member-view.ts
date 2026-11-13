import type { TemplateFormData } from "./types";
import type { BoardCalendarRole } from "@/lib/board-calendar/access";

type Row = Record<string, unknown>;

function rows(data: TemplateFormData, key: string): Row[] {
  const value = data[key];
  return Array.isArray(value)
    ? (value as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];
}

function pick(row: Row, keys: readonly string[]): Row {
  return Object.fromEntries(keys.filter((key) => key in row).map((key) => [key, row[key]]));
}

/** Only fields intended for board members may cross the server-to-client boundary. */
export function projectBoardCalendarForMember(data: TemplateFormData): TemplateFormData {
  return {
    fiscal_year: data.fiscal_year ?? "",
    monthly_calendar_year: data.monthly_calendar_year ?? "",
    monthly_calendar_month: data.monthly_calendar_month ?? "",
    meetings: rows(data, "meetings").map((row) => pick(row, [
      "id", "date", "time", "type", "committee", "location", "virtual_link", "confirmed",
    ])),
    annual_highlights: rows(data, "annual_highlights").map((row) => pick(row, [
      "date", "month", "title", "category",
    ])),
    agm_milestones: rows(data, "agm_milestones").map((row) => pick(row, [
      "calculated_date", "track", "task",
    ])),
    event_categories: rows(data, "event_categories").map((row) => pick(row, [
      "category", "hex_code",
    ])),
    documents: rows(data, "documents").map((row) => pick(row, [
      "id", "category", "content_type", "confidential", "file_name", "meeting_id",
      "name", "size", "size_label", "storage_path", "uploaded_at", "url",
    ])),
    board_contacts: rows(data, "board_contacts").map((row) => pick(row, [
      "id", "name", "boardRole", "email", "phone", "address", "committee", "receivesEmails",
    ])),
    committees: rows(data, "committees").map((row) => pick(row, [
      "name", "committee", "chair", "chair_user_id", "notes",
    ])),
    meeting_documents: rows(data, "meeting_documents").filter((row) => row.status === "approved"),
  };
}

export function projectBoardCalendarForRole(data: TemplateFormData, role: BoardCalendarRole): TemplateFormData {
  if (role === "administrator") return data;
  const common = projectBoardCalendarForMember(data);
  if (role === "member") return common;
  const fullMeetings = rows(data, "meetings");
  if (role === "chair") {
    return {
      ...common,
      meetings: fullMeetings,
      meeting_documents: rows(data, "meeting_documents"),
    };
  }
  return {
    ...common,
    meetings: fullMeetings,
    tasks: rows(data, "tasks"),
    operational_task_rules: rows(data, "operational_task_rules"),
  };
}
