import { z } from "zod";

import type { TemplateFormData } from "./types";

export const boardCalendarContactSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(160),
  boardRole: z.string().trim().max(100),
  email: z.email().max(320),
  phone: z.string().trim().max(50).regex(/^[+\d() .-]*$/),
  address: z.string().trim().max(500),
  committee: z.string().trim().max(160),
  receivesEmails: z.boolean(),
});

export type BoardCalendarContact = z.infer<typeof boardCalendarContactSchema>;

export function getBoardCalendarContacts(data: TemplateFormData): BoardCalendarContact[] {
  const rows = data.board_contacts;
  if (rows === undefined) return [];
  if (!Array.isArray(rows) || rows.length > 100) throw new Error("The board directory has too many contacts.");
  const parsed = z.array(boardCalendarContactSchema).parse(rows);
  const ids = new Set<string>();
  const emails = new Set<string>();
  for (const row of parsed) {
    if (ids.has(row.id)) throw new Error("Each board contact needs a unique ID.");
    const email = row.email.toLowerCase();
    if (emails.has(email)) throw new Error("Each board contact needs a unique email address.");
    ids.add(row.id);
    emails.add(email);
  }
  return parsed;
}
