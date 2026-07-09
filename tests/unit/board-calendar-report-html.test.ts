import { describe, expect, it } from "vitest";

import {
  buildBoardCalendarReport,
  buildBoardCalendarReportHtml,
  isBoardCalendarSchema,
} from "@/lib/template-renderer/board-calendar-report-html";
import type { BrandProfile } from "@/lib/types";
import type {
  TemplateFieldSchema,
  TemplateFormData,
} from "@/lib/template-renderer/types";

const brand: BrandProfile = {
  address: "123 Main St",
  contactEmail: "board@example.org",
  logoInitials: "OC",
  logoUrl: "",
  organizationName: "Olea Connects",
  phone: "555-0100",
  primaryColor: "#2F6B4F",
  secondaryColor: "#DF7A54",
  website: "https://example.org",
};

const boardCalendarSchema: TemplateFieldSchema = {
  version: 1,
  presentation: {
    calendar: {
      enabled: true,
      source: "board-calendar",
    },
  },
  sections: [],
};

const formData: TemplateFormData = {
  administrator: "Alex Admin",
  administrator_email: "alex@example.org",
  board_chair: "Sam Chair",
  committees: [
    {
      chair: "Taylor Treasurer",
      name: "Finance Committee",
      notes: "Meets monthly",
    },
  ],
  executive_director: "Riley ED",
  meetings: [
    {
      date: "2026-07-15",
      type: "Board Meeting",
      committee: "Q3 Board Meeting",
      time: "18:00",
      location: "Boardroom",
      virtual_link: "https://zoom.us/j/123",
      lead_contact: "Alex Admin",
      confirmed: "Yes",
      notes: "Budget review",
    },
  ],
  operational_task_rules: [
    {
      label: "Send board package",
      days_before: 7,
      applies_to: "Board Meeting",
      responsible: "Alex Admin",
    },
  ],
  tasks: [
    {
      task: "Manual prep",
      due_date: "2026-07-01",
      related_meeting: "Q3 Board Meeting",
      responsible: "Sam Chair",
      status: "In Progress",
      notes: "Call finance",
      done: false,
    },
  ],
  agm_milestones: [
    {
      track: "Governance",
      task: "Confirm venue",
      days_before: 30,
      calculated_date: "2026-06-01",
      responsible: "Sam Chair",
      status: "Not Started",
      notes: "Use accessible venue",
      done: false,
    },
  ],
  documents: [
    {
      id: "doc-agenda",
      meeting_id: "meeting-0",
      name: "Agenda <script>alert(1)</script>",
      category: "Agenda",
      confidential: true,
    },
  ],
};

describe("board calendar HTML report export", () => {
  it("detects calendar-backed template schemas", () => {
    expect(isBoardCalendarSchema(boardCalendarSchema)).toBe(true);
    expect(
      isBoardCalendarSchema({ version: 1, presentation: {}, sections: [] }),
    ).toBe(false);
  });

  it("builds report sections from board calendar data tables", () => {
    const report = buildBoardCalendarReport({
      formData,
      generatedAt: new Date("2026-07-09T12:00:00Z"),
      organizationName: "Olea Connects",
      title: "Board Calendar",
    });

    expect(report.sections.map((section) => section.title)).toEqual([
      "Meetings",
      "Staff task list",
      "Directory",
      "AGM planning timeline",
      "Board packages",
    ]);
    expect(report.sections[1].rows).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(["Manual prep", "2026-07-01"]),
        expect.arrayContaining(["Send board package", "2026-07-08"]),
      ]),
    );
  });

  it("renders real HTML tables with branding and escaped user content", () => {
    const html = buildBoardCalendarReportHtml({
      brand,
      formData,
      generatedAt: new Date("2026-07-09T12:00:00Z"),
      organizationName: "Olea Connects",
      title: "Board Calendar",
    });

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Meeting</th>");
    expect(html).toContain("Q3 Board Meeting");
    expect(html).toContain("Send board package");
    expect(html).toContain("--brand-primary: #2F6B4F;");
    expect(html).toContain("Agenda &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
