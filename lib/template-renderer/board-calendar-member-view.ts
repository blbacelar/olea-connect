import type { TemplateFormData } from "./types";

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
    event_categories: rows(data, "event_categories").map((row) => pick(row, [
      "category", "hex_code",
    ])),
    documents: rows(data, "documents").map((row) => pick(row, [
      "id", "category", "content_type", "confidential", "file_name", "meeting_id",
      "name", "size", "size_label", "storage_path", "uploaded_at", "url",
    ])),
    meeting_documents: rows(data, "meeting_documents").filter((row) => row.status === "approved"),
  };
}
