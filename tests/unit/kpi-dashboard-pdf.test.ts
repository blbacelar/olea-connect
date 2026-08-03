import { describe, expect, it } from "vitest";

import { brandName } from "@/lib/brand";
import type { KpiDashboardData } from "@/lib/data/kpi-dashboard";
import { renderKpiDashboardPdfBuffer } from "@/lib/kpi-dashboard/pdf-export";
import type { BrandProfile } from "@/lib/types";
import { inspectPdf } from "@/tests/support/pdf-inspector";

const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const brand: BrandProfile = {
  organizationName: "Olea QA Foundation",
  primaryColor: "#2F6B4F",
  secondaryColor: "#DBE8DD",
  logoInitials: "OQ",
  logoUrl: onePixelPng,
  address: "123 Main Street, Calgary, AB",
  phone: "+1 555 123 4567",
  contactEmail: "hello@example.org",
  website: "https://example.org",
};

const data: KpiDashboardData = {
  dashboard: {
    id: "dashboard-1",
    organizationId: "organization-1",
    title: "KPI Dashboard and Board Reporting",
    organizationName: "Olea QA Foundation",
    reportingYear: 2026,
    financialYearEnd: "2026-12-31",
  },
  quarters: [
    { monthNumber: 1, quarter: 1, sortOrder: 1 },
    { monthNumber: 2, quarter: 1, sortOrder: 2 },
    { monthNumber: 3, quarter: 1, sortOrder: 3 },
    { monthNumber: 4, quarter: 2, sortOrder: 4 },
    { monthNumber: 5, quarter: 2, sortOrder: 5 },
    { monthNumber: 6, quarter: 2, sortOrder: 6 },
    { monthNumber: 7, quarter: 3, sortOrder: 7 },
    { monthNumber: 8, quarter: 3, sortOrder: 8 },
    { monthNumber: 9, quarter: 3, sortOrder: 9 },
    { monthNumber: 10, quarter: 4, sortOrder: 10 },
    { monthNumber: 11, quarter: 4, sortOrder: 11 },
    { monthNumber: 12, quarter: 4, sortOrder: 12 },
  ],
  kpis: [
    {
      id: "kpi-1",
      domain: "Programs",
      name: "Client satisfaction",
      owner: "Executive Director",
      targetDisplay: ">= 80%",
      targetNumber: 80,
      baselineNumber: 65,
      outcomeArea: "Service quality",
      sortOrder: 1,
    },
  ],
  results: [
    { id: "result-1", kpiId: "kpi-1", quarter: 1, currentValue: 72, ragStatus: "amber", contextNotes: "" },
    { id: "result-2", kpiId: "kpi-1", quarter: 2, currentValue: 84, ragStatus: "green", contextNotes: "Improved after the spring survey." },
    { id: "result-3", kpiId: "kpi-1", quarter: 3, currentValue: null, ragStatus: "na", contextNotes: "" },
    { id: "result-4", kpiId: "kpi-1", quarter: 4, currentValue: null, ragStatus: "na", contextNotes: "" },
  ],
  assignments: [
    { kpiId: "kpi-1", quarter: 1 },
    { kpiId: "kpi-1", quarter: 2 },
  ],
  assessments: [
    { id: "assessment-1", kpiId: "kpi-1", fullYearRag: "amber", boardNotes: "Monitor the next survey." },
  ],
  milestones: [
    {
      id: "milestone-1",
      title: "Publish annual impact report",
      owner: "Board Chair",
      dueDate: "2026-12-15",
      status: "in_progress",
      notes: "Confirm the final narrative with the board.",
    },
  ],
  risks: [
    {
      id: "risk-1",
      area: "Data quality",
      description: "Quarterly survey response rate may decline.",
      mitigation: "Add a reminder sequence before the next survey.",
      owner: "Programs Lead",
      ragStatus: "amber",
    },
  ],
  annualSummary: {
    overview: "A year of steady service improvement.",
    achievements: "The team improved client satisfaction in Q2.",
    challenges: "Response rates remain uneven across programs.",
    stakeholderStory: "Partners reported clearer communication.",
    financialContext: "The board maintained a balanced operating plan.",
    riskResponse: "The team added a survey follow-up plan.",
    nextSteps: "Review results and confirm next-year targets.",
  },
};

describe("KPI dashboard PDF export", () => {
  it("renders a branded, multi-section report with readable report content", async () => {
    const buffer = await renderKpiDashboardPdfBuffer(data, brand);
    const pdf = await inspectPdf(buffer);
    const reportText = pdf.text.replace(/-\s+/g, "");

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.toString("latin1")).toContain("/Subtype /Image");
    expect(pdf.pageCount).toBe(5);
    expect(pdf.metadata).toMatchObject({
      author: "Olea QA Foundation",
      creator: brandName,
      producer: brandName,
      subject: "KPI Dashboard and Board Reporting",
      title: "Olea QA Foundation KPI Dashboard and Board Reporting",
    });
    expect(reportText).toContain("Executive summary");
    expect(reportText).toContain("Full-year KPI results");
    expect(reportText).toContain("Client satisfaction");
    expect(reportText).toContain("Publish annual impact report");
    expect(reportText).toContain("Quarterly survey response rate may decline.");
    expect(reportText).toContain("A year of steady service improvement.");
    expect(reportText).toContain("Page 5 of 5");
  });
});
