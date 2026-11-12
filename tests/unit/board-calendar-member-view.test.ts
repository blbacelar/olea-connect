import { describe, expect, it } from "vitest";

import { projectBoardCalendarForMember } from "@/lib/template-renderer/board-calendar-member-view";

describe("board calendar member projection", () => {
  it("keeps public meetings and approved documents without staff data or draft documents", () => {
    const projected = projectBoardCalendarForMember({
      fiscal_year: "2026",
      administrator_email: "private@example.org",
      tasks: [{ task: "Confidential board preparation" }],
      board_contacts: [{ email: "private@example.org" }],
      meetings: [{ id: "meeting-1", date: "2026-11-19", type: "Board Meeting", notes: "Private planning", location: "Office" }],
      annual_highlights: [{ date: "2026-11-20", title: "Annual event", notes: "Private notes" }],
      documents: [{ id: "doc-1", name: "Board package", storage_path: "org/package.pdf", internal_note: "Private" }],
      meeting_documents: [
        { status: "draft", sections: { agenda: "Private draft" } },
        { status: "approved", sections: { agenda: "Approved" } },
      ],
    });

    expect(projected).toMatchObject({
      fiscal_year: "2026",
      meetings: [{ id: "meeting-1", date: "2026-11-19", type: "Board Meeting", location: "Office" }],
      documents: [{ id: "doc-1", name: "Board package", storage_path: "org/package.pdf" }],
      meeting_documents: [{ status: "approved" }],
    });
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain("private@example.org");
    expect(serialized).not.toContain("Confidential board preparation");
    expect(serialized).not.toContain("Private planning");
    expect(serialized).not.toContain("Private draft");
    expect(serialized).not.toContain("Private notes");
  });
});
