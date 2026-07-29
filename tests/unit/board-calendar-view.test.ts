import { describe, expect, it } from "vitest";

import {
  buildCalendarEvents,
  buildCategoryColors,
  buildMonthGrid,
  getTemplateMonthIndex,
  getTemplateYear,
  getWeekDays,
  parseDateKey,
  toDateKey,
} from "@/lib/template-renderer/calendar-view";
import type { TemplateFormData } from "@/lib/template-renderer/types";

const templateData: TemplateFormData = {
  fiscal_year: "2026",
  monthly_calendar_month: "April",
  event_categories: [
    {
      category: "Board Meeting",
      hex_code: "#0F766E",
      used_for: "Full board meetings",
    },
    {
      category: "AGM / Annual Meeting",
      hex_code: "#B45309",
      used_for: "Annual meeting",
    },
  ],
  meetings: [
    {
      date: "2026-04-15",
      type: "Board Meeting",
      committee: "",
      time: "6:30 PM",
      location: "Boardroom",
      notes: "Q2 Board Meeting",
    },
    {
      date: "2026-04-08",
      type: "Committee Meeting",
      committee: "Finance Committee",
      time: "7:00 PM",
    },
  ],
  annual_highlights: [
    {
      month: "June",
      title: "AGM Notice issued",
      category: "AGM / Annual Meeting",
    },
  ],
  tasks: [
    {
      task: "Board package sent",
      due_date: "2026-04-03",
      status: "In Progress",
      related_meeting: "April board meeting",
      notes: "Send package after chair review",
    },
  ],
  agm_milestones: [
    {
      track: "AGM / Annual Meeting",
      task: "Confirm venue",
      calculated_date: "2026-02-25",
    },
  ],
};

describe("board calendar view helpers", () => {
  it("normalizes template meetings, deadlines, and AGM milestones into calendar events", () => {
    const events = buildCalendarEvents(templateData);

    expect(events.map((event) => event.id)).toEqual([
      "agm-0",
      "task-0",
      "meeting-1",
      "meeting-0",
      "annual-0",
    ]);
    expect(events.find((event) => event.id === "meeting-0")).toMatchObject({
      title: "Board Meeting",
      dateKey: "2026-04-15",
      category: "Board Meeting",
      color: "#0F766E",
      time: "6:30 PM",
      location: "Boardroom",
      notes: "Q2 Board Meeting",
    });
    expect(events.find((event) => event.id === "meeting-1")).toMatchObject({
      title: "Finance Committee",
      category: "Committee Meeting",
    });
    expect(events.find((event) => event.id === "annual-0")).toMatchObject({
      title: "AGM Notice issued",
      dateKey: null,
      monthIndex: 5,
      color: "#B45309",
    });
    expect(events.find((event) => event.id === "task-0")).toMatchObject({
      title: "Board package sent",
      relatedMeeting: "April board meeting",
      notes: "Send package after chair review",
    });
  });

  it("uses the workbook fiscal year and selected month when present", () => {
    expect(getTemplateYear(templateData)).toBe(2026);
    expect(getTemplateMonthIndex(templateData)).toBe(3);
  });

  it("orders same-day calendar events by time and formats time consistently", () => {
    const events = buildCalendarEvents({
      meetings: [
        {
          date: "2026-04-15",
          type: "Board Meeting",
          time: "2:00 PM",
        },
        {
          date: "2026-04-15",
          type: "Committee Meeting",
          time: "09:30",
        },
        {
          date: "2026-04-15",
          type: "Board Recruitment",
        },
      ],
    });

    expect(events.map((event) => event.id)).toEqual([
      "meeting-1",
      "meeting-0",
      "meeting-2",
    ]);
    expect(events.map((event) => event.time)).toEqual([
      "9:30 AM",
      "2:00 PM",
      "",
    ]);
  });

  it("builds a six-week month grid starting on Sunday", () => {
    const grid = buildMonthGrid(2026, 3);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toMatchObject({
      dateKey: "2026-03-29",
      isCurrentMonth: false,
    });
    expect(grid[3]).toMatchObject({
      dateKey: "2026-04-01",
      isCurrentMonth: true,
    });
  });

  it("builds week ranges around the selected date without UTC drift", () => {
    const anchorDate = parseDateKey("2026-04-15");
    if (!anchorDate) throw new Error("Expected a parsed date.");

    expect(getWeekDays(anchorDate).map(toDateKey)).toEqual([
      "2026-04-12",
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
    ]);
  });

  it("ignores invalid category colors and keeps safe defaults", () => {
    const colors = buildCategoryColors({
      event_categories: [
        { category: "Board Meeting", hex_code: "not-a-color" },
      ],
    });

    expect(colors.get("Board Meeting")).toBe("#1A6B6B");
  });
});
