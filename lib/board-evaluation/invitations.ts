import { z } from "zod";

const emailSchema = z.email().max(320);

/** A shared survey URL is sent to every address; addresses never join responses. */
export function parseBoardEvaluationInviteEmails(raw: string) {
  const addresses = raw.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean);
  if (!addresses.length) throw new Error("Enter at least one board member email address.");
  if (addresses.length > 100) throw new Error("Send to at most 100 addresses at a time.");
  const unique = [...new Set(addresses.map((value) => value.toLowerCase()))];
  for (const email of unique) {
    if (!emailSchema.safeParse(email).success) {
      throw new Error(`Check the email address: ${email.slice(0, 80)}.`);
    }
  }
  return unique;
}
