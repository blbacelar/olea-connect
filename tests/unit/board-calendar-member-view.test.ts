import { describe, expect, it } from "vitest";

import { projectBoardCalendarForMember, projectBoardCalendarForRole } from "@/lib/template-renderer/board-calendar-member-view";
import { mergeBoardCalendarScopedWrite } from "@/lib/board-calendar/scoped-write";

describe("board calendar member projection", () => {
  it("keeps public meetings and approved documents without staff data or draft documents", () => {
    const projected = projectBoardCalendarForMember({
      fiscal_year: "2026",
      administrator_email: "private@example.org",
      tasks: [{ task: "Confidential board preparation" }],
      board_contacts: [{ id: "contact-1", name: "Board Member", email: "board@example.org", boardRole: "Director", private_note: "Hidden" }],
      meetings: [{ id: "meeting-1", date: "2026-11-19", type: "Board Meeting", notes: "Private planning", location: "Office" }],
      annual_highlights: [{ date: "2026-11-20", title: "Annual event", notes: "Private notes" }],
      agm_milestones: [{ calculated_date: "2026-11-21", task: "AGM prep", notes: "Internal" }],
      committees: [{ name: "Finance", chair: "Alex", private_field: "Hidden" }],
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
      board_contacts: [{ id: "contact-1", name: "Board Member", email: "board@example.org", boardRole: "Director" }],
      agm_milestones: [{ calculated_date: "2026-11-21", task: "AGM prep" }],
      committees: [{ name: "Finance", chair: "Alex" }],
    });
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain("private@example.org");
    expect(serialized).not.toContain("Confidential board preparation");
    expect(serialized).not.toContain("Private planning");
    expect(serialized).not.toContain("Private draft");
    expect(serialized).not.toContain("Private notes");
    expect(serialized).not.toContain("Hidden");
  });

  it("projects Chair and Executive data and merges only allowed edits into the full record", () => {
    const full = {
      administrator_email: "private@example.org",
      board_chair_email: "chair-private@example.org",
      meetings: [{ id: "meeting-1", date: "2026-11-19", type: "Board Meeting", notes: "Meeting details" }],
      agm_milestones: [{ calculated_date: "2026-11-21", task: "AGM prep", notes: "Internal" }],
      tasks: [{ id: "task-1", task: "Prepare report", status: "Not Started", notes: "Staff note" }],
      operational_task_rules: [{ label: "Prepare report", days_before: 7 }],
      meeting_documents: [
        { id: "draft", status: "draft", sections: { agenda: "Private draft" } },
        { id: "approved", status: "approved", sections: { agenda: "Approved" } },
      ],
      documents: [{ id: "file-1", name: "Board package" }],
    };
    const chair = projectBoardCalendarForRole(full, "chair");
    const executive = projectBoardCalendarForRole(full, "executive");
    expect(JSON.stringify(chair)).not.toContain("private@example.org");
    expect(chair.tasks).toBeUndefined();
    expect(chair.meeting_documents).toHaveLength(2);
    expect(executive.tasks).toHaveLength(1);
    expect(executive.meeting_documents).toHaveLength(1);
    expect(JSON.stringify(executive)).not.toContain("chair-private@example.org");
    expect(JSON.stringify(executive)).not.toContain("Private draft");

    const chairMerged = mergeBoardCalendarScopedWrite(full, {
      ...chair, meeting_documents: [...(chair.meeting_documents as Record<string, unknown>[]), { id: "new", status: "draft" }],
    }, "chair");
    expect(chairMerged.administrator_email).toBe(full.administrator_email);
    expect(chairMerged.tasks).toEqual(full.tasks);
    expect(chairMerged.meeting_documents).toHaveLength(3);
    expect(() => mergeBoardCalendarScopedWrite(full, { ...chair, administrator_email: "forged" }, "chair"))
      .toThrow(/Committee Chairs/);

    const executiveMerged = mergeBoardCalendarScopedWrite(full, {
      ...executive, tasks: [{ ...full.tasks[0], status: "In Progress" }],
    }, "executive");
    expect(executiveMerged.tasks).toEqual([{ ...full.tasks[0], status: "In Progress" }]);
    expect(executiveMerged.meeting_documents).toEqual(full.meeting_documents);
    expect(() => mergeBoardCalendarScopedWrite(full, {
      ...executive, tasks: [{ ...full.tasks[0], notes: "Forged" }],
    }, "executive")).toThrow(/status only/);

    const defaulted = { ...full };
    const visibleWithDefaults = projectBoardCalendarForRole({ ...defaulted, event_categories: [{ category: "Meeting" }] }, "executive");
    expect(mergeBoardCalendarScopedWrite(defaulted, {
      ...visibleWithDefaults, tasks: [{ ...full.tasks[0], status: "In Progress" }],
    }, "executive", { event_categories: [{ category: "Meeting" }] }).tasks)
      .toEqual([{ ...full.tasks[0], status: "In Progress" }]);
  });
});
