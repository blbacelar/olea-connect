import { describe, expect, it } from "vitest";

import {
  appendBoardCalendarEntry,
  buildBoardCalendarSetup,
  buildGeneratedStaffTasks,
  calculateAgmMilestoneDate,
  createBoardCalendarEntryRow,
  deleteBoardCalendarEntry,
  getBoardCalendarEntryInput,
  syncBoardCalendarGeneratedTasks,
  updateBoardCalendarEntry,
  upsertBoardCalendarCategoryColor,
} from "@/lib/template-renderer/board-calendar-editor";
import { buildCalendarEvents } from "@/lib/template-renderer/calendar-view";
import type { TemplateFormData } from "@/lib/template-renderer/types";

describe("board calendar editor helpers", () => {
  it("normalizes setup details, committees, responsible options, and task rules", () => {
    expect(
      buildBoardCalendarSetup({
        fiscal_year: "2026",
        administrator: "Bruno",
        administrator_email: "bruno@example.com",
        executive_director: "Alex ED",
        board_chair: "Sam Chair",
        committees: [
          { name: "Finance Committee" },
          { name: "Governance Committee" },
          { name: "" },
          { name: "Extra 1" },
          { name: "Extra 2" },
          { name: "Extra 3" },
          { name: "Extra 4" },
          { name: "Extra 5" },
          { name: "Extra 6" },
        ],
        operational_task_rules: [
          {
            label: "Send save-the-date",
            days_before: 30,
            applies_to: "Board Meeting",
            responsible: "Administrator",
          },
          {
            label: "Draft action items",
            days_after: 1,
            days_before: 0,
            applies_to: "Board Meeting",
            responsible: "Board Chair",
          },
          { label: "" },
        ],
      }),
    ).toMatchObject({
      fiscalYear: "2026",
      administrator: "Bruno",
      administratorEmail: "bruno@example.com",
      executiveDirector: "Alex ED",
      boardChair: "Sam Chair",
      committees: [
        "Finance Committee",
        "Governance Committee",
        "Extra 1",
        "Extra 2",
        "Extra 3",
        "Extra 4",
        "Extra 5",
        "Extra 6",
      ],
      responsibleOptions: expect.arrayContaining([
        "Administrator",
        "Executive Director",
        "Board Chair",
        "Finance Committee",
        "Governance Committee",
      ]),
      operationalTaskRules: [
        {
          label: "Send save-the-date",
          daysOffset: -30,
          appliesTo: "Board Meeting",
          responsible: "Administrator",
        },
        {
          label: "Draft action items",
          daysOffset: 1,
          appliesTo: "Board Meeting",
          responsible: "Board Chair",
        },
      ],
    });
  });

  it("generates staff tasks from meetings and preserves user-editable task fields", () => {
    const generated = buildGeneratedStaffTasks({
      meetings: [
        {
          date: "2026-06-17",
          type: "Board Meeting",
          committee: "Q2 Board Meeting",
        },
        {
          date: "2026-06-20",
          type: "Committee Meeting",
          committee: "Finance Committee",
        },
      ],
      operational_task_rules: [
        {
          label: "Send save-the-date",
          days_before: 30,
          applies_to: "Board Meeting",
          responsible: "Administrator",
        },
        {
          label: "Draft action items",
          days_after: 1,
          applies_to: "Any meeting",
          responsible: "Board Chair",
        },
      ],
      tasks: [
        {
          generated_key:
            "meeting:2026-06-17:Board Meeting:Q2 Board Meeting:Send save-the-date:-30:Board Meeting",
          task: "Send save-the-date",
          due_date: "2026-05-18",
          related_meeting: "Q2 Board Meeting",
          responsible: "Board Chair",
          status: "In Progress",
          notes: "Already drafted.",
          done: false,
        },
      ],
    });

    expect(generated).toEqual([
      {
        generated_key:
          "meeting:2026-06-17:Board Meeting:Q2 Board Meeting:Send save-the-date:-30:Board Meeting",
        task: "Send save-the-date",
        due_date: "2026-05-18",
        related_meeting: "Q2 Board Meeting",
        responsible: "Board Chair",
        status: "In Progress",
        notes: "Already drafted.",
        done: false,
      },
      {
        generated_key:
          "meeting:2026-06-17:Board Meeting:Q2 Board Meeting:Draft action items:1:Any meeting",
        task: "Draft action items",
        due_date: "2026-06-18",
        related_meeting: "Q2 Board Meeting",
        responsible: "Board Chair",
        status: "",
        notes: "",
        done: false,
      },
      {
        generated_key:
          "meeting:2026-06-20:Committee Meeting:Finance Committee:Draft action items:1:Any meeting",
        task: "Draft action items",
        due_date: "2026-06-21",
        related_meeting: "Finance Committee",
        responsible: "Board Chair",
        status: "",
        notes: "",
        done: false,
      },
    ]);
  });

  it("syncs generated staff tasks into calendar data while preserving manual tasks", () => {
    const synced = syncBoardCalendarGeneratedTasks({
      meetings: [
        {
          date: "2026-06-17",
          type: "Board Meeting",
          committee: "Q2 Board Meeting",
        },
      ],
      operational_task_rules: [
        {
          label: "Send agenda package",
          days_before: 7,
          applies_to: "Board Meeting",
          responsible: "Administrator",
        },
      ],
      tasks: [
        {
          task: "Manual follow-up",
          due_date: "2026-06-20",
          related_meeting: "",
          responsible: "Board Chair",
          status: "Not Started",
          notes: "This should remain.",
          done: false,
        },
      ],
    });

    expect(synced.tasks).toEqual([
      {
        task: "Manual follow-up",
        due_date: "2026-06-20",
        related_meeting: "",
        responsible: "Board Chair",
        status: "Not Started",
        notes: "This should remain.",
        done: false,
      },
      {
        generated_key:
          "meeting:2026-06-17:Board Meeting:Q2 Board Meeting:Send agenda package:-7:Board Meeting",
        task: "Send agenda package",
        due_date: "2026-06-10",
        related_meeting: "Q2 Board Meeting",
        responsible: "Administrator",
        status: "",
        notes: "",
        done: false,
      },
    ]);
  });

  it("removes stale generated staff tasks when meetings no longer match rules", () => {
    const synced = syncBoardCalendarGeneratedTasks({
      meetings: [],
      operational_task_rules: [
        {
          label: "Send agenda package",
          days_before: 7,
          applies_to: "Board Meeting",
          responsible: "Administrator",
        },
      ],
      tasks: [
        {
          generated_key:
            "meeting:2026-06-17:Board Meeting:Q2 Board Meeting:Send agenda package:-7:Board Meeting",
          task: "Send agenda package",
          due_date: "2026-06-10",
          related_meeting: "Q2 Board Meeting",
          responsible: "Administrator",
          status: "In Progress",
          notes: "Old generated task.",
          done: false,
        },
        {
          task: "Manual follow-up",
          due_date: "2026-06-20",
          status: "Not Started",
        },
      ],
    });

    expect(synced.tasks).toEqual([
      {
        task: "Manual follow-up",
        due_date: "2026-06-20",
        status: "Not Started",
      },
    ]);
  });

  it("calculates AGM milestone target dates from days before AGM", () => {
    expect(calculateAgmMilestoneDate("2026-06-17", 30)).toBe("2026-05-18");
    expect(calculateAgmMilestoneDate("2026-06-17", -7)).toBe("2026-06-24");
    expect(calculateAgmMilestoneDate("not-a-date", 30)).toBe("");
  });

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
        id: expect.any(String),
        date: "2026-04-15",
        type: "Committee Meeting",
        committee: "Finance Committee",
        time: "18:30",
        location: "Zoom",
        virtual_link: "",
        lead_contact: "",
        notes: "Budget package review",
        confirmed: "",
      },
    ]);
  });

  it("keeps duplicate same-date and same-time meetings as separate calendar events", () => {
    const firstMutation = appendBoardCalendarEntry(
      {},
      {
        type: "meeting",
        dateKey: "2026-06-27",
        title: "Board Budget Review",
        category: "Board Meeting",
        time: "13:30",
        location: "Boardroom A",
      },
    );
    const secondMutation = appendBoardCalendarEntry(
      { meetings: firstMutation.value },
      {
        type: "meeting",
        dateKey: "2026-06-27",
        title: "Parallel Finance Committee",
        category: "Committee Meeting",
        time: "13:30",
        location: "Zoom",
      },
    );

    const events = buildCalendarEvents({
      meetings: secondMutation.value,
    });

    expect(events).toMatchObject([
      {
        title: "Parallel Finance Committee",
        dateKey: "2026-06-27",
        time: "1:30 PM",
      },
      {
        title: "Board Budget Review",
        dateKey: "2026-06-27",
        time: "1:30 PM",
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
          responsible: "",
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
          daysBeforeAgm: 112,
          notes: "Book venue if in person.",
        },
      ),
    ).toMatchObject({
      path: ["agm_milestones"],
      value: [
        {
          track: "Governance",
          task: "Confirm AGM venue",
          days_before: 112,
          calculated_date: "2026-02-25",
          responsible: "",
          status: "",
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
          id: expect.any(String),
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

  it("adds and updates category colors from the calendar entry form", () => {
    const added = upsertBoardCalendarCategoryColor(
      {},
      "Board Meeting",
      "#2563eb",
    );

    expect(added).toEqual({
      path: ["event_categories"],
      value: [
        {
          category: "Board Meeting",
          hex_code: "#2563EB",
          used_for: "Set from calendar entry form",
        },
      ],
    });

    const updated = upsertBoardCalendarCategoryColor(
      {
        event_categories: [
          {
            category: "Board Meeting",
            hex_code: "#2563EB",
            used_for: "Full board meetings",
          },
        ],
      },
      "Board Meeting",
      "#0f766e",
    );

    expect(updated).toEqual({
      path: ["event_categories"],
      value: [
        {
          category: "Board Meeting",
          hex_code: "#0F766E",
          used_for: "Full board meetings",
        },
      ],
    });
  });

  it("ignores invalid category color updates", () => {
    expect(
      upsertBoardCalendarCategoryColor({}, "Board Meeting", "not-a-color"),
    ).toBeNull();
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
          days_before: 112,
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
      daysBeforeAgm: 112,
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
        daysBeforeAgm: 98,
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
          days_before: 98,
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
