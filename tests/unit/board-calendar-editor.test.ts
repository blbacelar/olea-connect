import { describe, expect, it } from "vitest";

import {
  appendBoardCalendarEntry,
  createBoardCalendarEntryRow,
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
          notes: "Related to May board meeting",
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
          notes: "Budget package review",
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
      notes: "Budget package review",
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
      notes: "Updated agenda.",
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
          virtual_link: "https://example.com/meeting",
          lead_contact: "Treasurer",
          notes: "Updated agenda.",
          confirmed: "Yes",
        },
      ],
    });
  });
});
