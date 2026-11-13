import { describe, expect, it } from "vitest";

import { boardCalendarContactSchema, getBoardCalendarContacts, getBoardCalendarDateRecipients } from "@/lib/template-renderer/board-calendar-contacts";

const contact = {
  id: "contact-1", name: "Alex Chair", boardRole: "Chair", email: "",
  phone: "", address: "", committee: "", receivesEmails: true,
};

describe("Board Calendar contact directory", () => {
  it("allows board members without an email, matching the contact form", () => {
    expect(boardCalendarContactSchema.parse(contact).email).toBe("");
    expect(getBoardCalendarContacts({ board_contacts: [contact, { ...contact, id: "contact-2", name: "Sam Director" }] })).toHaveLength(2);
  });

  it("rejects malformed and duplicate non-empty email addresses", () => {
    expect(() => boardCalendarContactSchema.parse({ ...contact, email: "not-an-email" })).toThrow();
    expect(() => getBoardCalendarContacts({ board_contacts: [
      { ...contact, email: "alex@example.org" },
      { ...contact, id: "contact-2", email: "ALEX@example.org" },
    ] })).toThrow(/unique email/);
  });

  it("sends date notices only to opted-in contacts with an email", () => {
    expect(getBoardCalendarDateRecipients({ board_contacts: [
      contact,
      { ...contact, id: "contact-2", email: "sam@example.org" },
      { ...contact, id: "contact-3", email: "pat@example.org", receivesEmails: false },
    ] }).map((row) => row.id)).toEqual(["contact-2"]);
  });
});
