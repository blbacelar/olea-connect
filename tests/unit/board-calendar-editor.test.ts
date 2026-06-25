import { describe, expect, it } from "vitest";

import {
  appendBoardCalendarEntry,
  createBoardCalendarEntryRow,
  deleteBoardCalendarEntry,
  getBoardCalendarEntryInput,
  updateBoardCalendarEntry,
} from "@/lib/template-renderer/board-calendar-editor";
import type { TemplateFormData } from "@/lib/template-renderer/types";

describe("board calendar editor helpers", () => {
  it("adds meetings through the calendar into the meeting schedule rows", () => {
    const data: TemplateFormData = {
      meetings: [
        {
          date: "2026-01-21",
          type: "Board Meeting",
          committee: "Q1 Board Meeting",
        },
      ],
    };

    const mutation = appendBoardCalendarEntry(data, {
      type: "meeting",
      dateKey: "2026-04-15",
      title: "Finance Committee",
      category: "Committee Meeting",
      time: "18:30",
      location: "Zoom",
      notes: "Budget package review",
    });

    expect(mutation.path).toEqual(["meetings"]);
    expect(mutation.value).toEqual([
      {
        date: "2026-01-21",
        type: "Board Meeting",
        committee: "Q1 Board Meeting",
      },
      {
        date: "2026-04-15",
        type: "Committee Meeting",
        committee: "Finance Committee",
        time: "18:30",
        location: "Zoom",
        virtual_link: "",
        lead_contact: "Administrator",
        notes: "Budget package review",
        confirmed: "TBC",
      },
    ]);
  });

  it("maps calendar notes to annual highlights with the matching month", () => {
    expect(
      createBoardCalendarEntryRow({
        type: "annual_highlight",
        dateKey: "2026-06-17",
        title: "AGM Notice issued",
        category: "AGM / Annual Meeting",
        notes: "Send package to members.",
      }),
    ).toEqual({
      month: "June",
      date: "2026-06-17",
      title: "AGM Notice issued",
      category: "AGM / Annual Meeting",
      notes: "Send package to members.",
    });
  });

  it("maps tasks and AGM milestones to their workbook collections", () => {
    expect(
      appendBoardCalendarEntry(
        {},
        {
          type: "staff_task",
          dateKey: "2026-05-01",
          title: "Draft board package",
          category: "Not Started",
          relatedMeeting: "Related to May board meeting",
          notes: "Prep materials.",
        },
      ),
    ).toMatchObject({
      path: ["tasks"],
      value: [
        {
          task: "Draft board package",
          due_date: "2026-05-01",
          related_meeting: "Related to May board meeting",
          responsible: "Administrator",
          status: "Not Started",
          notes: "Prep materials.",
          done: false,
        },
      ],
    });

    expect(
      appendBoardCalendarEntry(
        {},
        {
          type: "agm_milestone",
          dateKey: "2026-02-25",
          title: "Confirm AGM venue",
          category: "Governance",
          notes: "Book venue if in person.",
        },
      ),
    ).toMatchObject({
      path: ["agm_milestones"],
      value: [
        {
          track: "Governance",
          task: "Confirm AGM venue",
          weeks_before: 0,
          calculated_date: "2026-02-25",
          responsible: "Administrator",
          status: "Not Started",
          notes: "Book venue if in person.",
        },
      ],
    });
  });

  it("reads an existing calendar event into editable form values", () => {
    const data: TemplateFormData = {
      meetings: [
        {
          date: "2026-04-15",
          type: "Committee Meeting",
          committee: "Finance Committee",
          time: "18:30",
          location: "Zoom",
          virtual_link: "https://example.com/meeting",
          lead_contact: "Treasurer",
          notes: "Budget package review",
          confirmed: "Yes",
        },
      ],
    };

    expect(getBoardCalendarEntryInput(data, "meeting-0")).toEqual({
      type: "meeting",
      dateKey: "2026-04-15",
      title: "Finance Committee",
      category: "Committee Meeting",
      time: "18:30",
      location: "Zoom",
      virtualLink: "https://example.com/meeting",
      leadContact: "Treasurer",
      notes: "Budget package review",
      confirmed: "Yes",
    });
  });

  it("converts workbook display times into time input values when editing", () => {
    const data: TemplateFormData = {
      meetings: [
        {
          date: "2026-04-15",
          type: "Board Meeting",
          committee: "",
          time: "6:30 PM",
        },
      ],
    };

    expect(getBoardCalendarEntryInput(data, "meeting-0")).toMatchObject({
      time: "18:30",
    });
  });

  it("updates the existing backing row instead of appending a duplicate", () => {
    const data: TemplateFormData = {
      meetings: [
        {
          date: "2026-04-15",
          type: "Committee Meeting",
          committee: "Finance Committee",
          time: "18:30",
          location: "Zoom",
          virtual_link: "https://example.com/meeting",
          lead_contact: "Treasurer",
          notes: "Budget package review",
          confirmed: "Yes",
        },
      ],
    };

    const mutation = updateBoardCalendarEntry(data, "meeting-0", {
      type: "meeting",
      dateKey: "2026-04-22",
      title: "Finance and Audit Committee",
      category: "Committee Meeting",
      time: "19:00",
      location: "Boardroom",
      virtualLink: "https://example.com/updated",
      leadContact: "Governance Chair",
      notes: "Updated agenda.",
      confirmed: "No",
    });

    expect(mutation).toEqual({
      path: ["meetings"],
      value: [
        {
          date: "2026-04-22",
          type: "Committee Meeting",
          committee: "Finance and Audit Committee",
          time: "19:00",
          location: "Boardroom",
          virtual_link: "https://example.com/updated",
          lead_contact: "Governance Chair",
          notes: "Updated agenda.",
          confirmed: "No",
        },
      ],
    });
  });

  it("reads and updates all staff task fields", () => {
    const data: TemplateFormData = {
      tasks: [
        {
          task: "Draft board package",
          due_date: "2026-05-01",
          related_meeting: "May board meeting",
          responsible: "Administrator",
          status: "In Progress",
          notes: "Use the finance report.",
          done: false,
        },
      ],
    };

    expect(getBoardCalendarEntryInput(data, "task-0")).toEqual({
      type: "staff_task",
      dateKey: "2026-05-01",
      title: "Draft board package",
      category: "In Progress",
      relatedMeeting: "May board meeting",
      responsible: "Administrator",
      status: "In Progress",
      notes: "Use the finance report.",
      done: false,
    });

    expect(
      updateBoardCalendarEntry(data, "task-0", {
        type: "staff_task",
        dateKey: "2026-05-02",
        title: "Send board package",
        category: "Complete",
        relatedMeeting: "May board meeting",
        responsible: "Board Chair",
        status: "Complete",
        notes: "Sent by email.",
        done: true,
      }),
    ).toEqual({
      path: ["tasks"],
      value: [
        {
          task: "Send board package",
          due_date: "2026-05-02",
          related_meeting: "May board meeting",
          responsible: "Board Chair",
          status: "Complete",
          notes: "Sent by email.",
          done: true,
        },
      ],
    });
  });

  it("reads and updates all AGM milestone fields", () => {
    const data: TemplateFormData = {
      agm_milestones: [
        {
          track: "Governance",
          task: "Confirm AGM venue",
          weeks_before: 16,
          calculated_date: "2026-02-25",
          responsible: "Governance Chair",
          status: "Not Started",
          notes: "Book venue if in person.",
          done: false,
        },
      ],
    };

    expect(getBoardCalendarEntryInput(data, "agm-0")).toEqual({
      type: "agm_milestone",
      dateKey: "2026-02-25",
      title: "Confirm AGM venue",
      category: "Governance",
      weeksBefore: 16,
      responsible: "Governance Chair",
      status: "Not Started",
      notes: "Book venue if in person.",
      done: false,
    });

    expect(
      updateBoardCalendarEntry(data, "agm-0", {
        type: "agm_milestone",
        dateKey: "2026-03-01",
        title: "Confirm hybrid AGM venue",
        category: "Operations",
        weeksBefore: 14,
        responsible: "Administrator",
        status: "In Progress",
        notes: "Confirm AV.",
        done: true,
      }),
    ).toEqual({
      path: ["agm_milestones"],
      value: [
        {
          track: "Operations",
          task: "Confirm hybrid AGM venue",
          weeks_before: 14,
          calculated_date: "2026-03-01",
          responsible: "Administrator",
          status: "In Progress",
          notes: "Confirm AV.",
          done: true,
        },
      ],
    });
  });

  it("deletes an existing backing row by calendar event id", () => {
    const data: TemplateFormData = {
      annual_highlights: [
        { date: "2026-06-01", title: "Budget review" },
        { date: "2026-06-17", title: "AGM" },
      ],
    };

    expect(deleteBoardCalendarEntry(data, "annual-0")).toEqual({
      path: ["annual_highlights"],
      value: [{ date: "2026-06-17", title: "AGM" }],
    });
  });
});
