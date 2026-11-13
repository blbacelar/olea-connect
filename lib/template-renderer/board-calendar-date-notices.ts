import { createHash } from "node:crypto";

import type { TemplateFormData } from "@/lib/template-renderer/types";

type Row = Record<string, unknown>;

export interface BoardCalendarDateNotice {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  mode: "review" | "auto" | "none";
  revision: string;
}

export function getBoardCalendarDateNotices(data: TemplateFormData): BoardCalendarDateNotice[] {
  const rows = Array.isArray(data.meetings) ? data.meetings : [];
  const today = new Date().toISOString().slice(0, 10);
  return rows.flatMap((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Row;
    const date = typeof row.date === "string" ? row.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return [];
    const mode = row.notify_mode === "auto" || row.notify_mode === "none" ? row.notify_mode : "review";
    if (mode === "none") return [];
    const id = typeof row.id === "string" && row.id ? row.id : `meeting-${index}`;
    const title = String(row.committee || row.type || "Board meeting").slice(0, 200);
    const time = typeof row.time === "string" ? row.time : "";
    const location = typeof row.location === "string" ? row.location : "";
    const revision = createHash("sha256")
      .update(JSON.stringify([id, title, date, time, location]))
      .digest("hex").slice(0, 24);
    return [{ id, title, date, time, location, mode, revision }];
  });
}

export function boardCalendarDateDeliveryKey(
  instanceId: string,
  notice: BoardCalendarDateNotice,
  recipientId: string,
) {
  return createHash("sha256")
    .update(JSON.stringify([instanceId, notice.id, notice.revision, recipientId]))
    .digest("hex");
}
