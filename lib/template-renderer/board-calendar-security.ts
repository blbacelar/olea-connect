import type { TemplateFormData } from "./types";

export interface BoardCalendarSecurity {
  requireAck: boolean;
  logAccess: boolean;
  watermark: boolean;
}

/** Existing calendars retain the source HTML's three enabled security defaults. */
export function getBoardCalendarSecurity(data: TemplateFormData): BoardCalendarSecurity {
  const value = data.security;
  const saved = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  return {
    requireAck: saved.requireAck !== false,
    logAccess: saved.logAccess !== false,
    watermark: saved.watermark !== false,
  };
}
