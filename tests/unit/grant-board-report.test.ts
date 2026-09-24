import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";
import { renderGrantBoardReportPdfBuffer } from "@/lib/grants/board-report-pdf";
import { filterGrantApplications, isGrantApplicationPastDue } from "@/lib/grants/pipeline";
import type { BrandProfile } from "@/lib/types";
import { inspectPdf } from "@/tests/support/pdf-inspector";

const application: GrantPlatformWorkspaceData["applications"][number] = {
  id: "application-1",
  roundId: "round-1",
  roundName: "Community Arts Fund",
  status: "draft",
  focusArea: "Arts education",
  fundingRequest: "Expand after-school classes",
  requestedAmountCents: 1250000,
  submittedAt: null,
  deadlineAt: "2026-12-31T00:00:00.000Z",
  collaborationNote: null,
  updatedAt: "2026-09-24T00:00:00.000Z",
  awardStatus: null,
  summary: "Draft package in progress",
  nextMilestone: "Gather evidence and finalize the narrative",
  funderName: "Community Foundation",
};

const data = {
  organizationName: "Olea QA Foundation",
  applications: [application],
} as GrantPlatformWorkspaceData;

const brand: BrandProfile = {
  organizationName: "Olea QA Foundation",
  primaryColor: "#2F6B4F",
  secondaryColor: "#D97757",
  logoInitials: "OQ",
  contactEmail: "hello@example.org",
};

describe("grant board report", () => {
  it("filters only saved applications by name, funder, and status", () => {
    const applications = [application, { ...application, id: "application-2", status: "approved", roundName: "Health Grant" }];
    expect(filterGrantApplications(applications, { searchQuery: "community foundation", statusFilter: "draft" })).toEqual([application]);
    expect(filterGrantApplications(applications, { searchQuery: "health", statusFilter: "draft" })).toEqual([]);
  });

  it("marks only draft applications overdue after the displayed deadline date", () => {
    const now = new Date("2026-09-24T20:00:00.000Z");
    const dueToday = { ...application, deadlineAt: "2026-09-24T00:00:00.000Z" };
    expect(isGrantApplicationPastDue(dueToday, now)).toBe(false);
    expect(isGrantApplicationPastDue({ ...dueToday, deadlineAt: "2026-09-23T23:59:59.000Z" }, now)).toBe(true);
    expect(isGrantApplicationPastDue({ ...dueToday, status: "submitted", deadlineAt: "2026-09-23T23:59:59.000Z" }, now)).toBe(false);
  });

  it("renders a branded cover and saved pipeline data with page numbering", async () => {
    const buffer = await renderGrantBoardReportPdfBuffer(data, brand);
    const pdf = await inspectPdf(buffer);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.pageCount).toBe(2);
    expect(pdf.text).toContain("Olea QA Foundation");
    expect(pdf.text).toContain("Community Arts Fund");
    expect(pdf.text).toContain("Community Foundation");
    expect(pdf.text).toContain("$12,500");
    expect(pdf.text).toContain("Page 2 of 2");
    expect(pdf.text).not.toContain("BC Community Gaming Grant - Arts");
  });

  it("shows an honest empty state", async () => {
    const buffer = await renderGrantBoardReportPdfBuffer({ ...data, applications: [] }, brand);
    const pdf = await inspectPdf(buffer);
    expect(pdf.text).toContain("No saved grant applications are available");
    expect(pdf.text).toContain("APPLICATIONS 0");
  });

  it("preserves cents and long application details in the PDF", async () => {
    const detailed = {
      ...application,
      requestedAmountCents: 123456,
      nextMilestone: `${"Complete supporting evidence. ".repeat(300)} FINAL_ACTION`,
    };
    const buffer = await renderGrantBoardReportPdfBuffer({ ...data, applications: [detailed] }, brand);
    const pdf = await inspectPdf(buffer);
    expect(pdf.text).toContain("$1,234.56");
    expect(pdf.text).toContain("FINAL_ACTION");
    expect(pdf.pageCount).toBeGreaterThan(2);
  });

  it("repeats the branded header and page number across overflow pages", async () => {
    const applications = Array.from({ length: 30 }, (_, index) => ({
      ...application,
      id: `application-${index}`,
      roundName: `Community Arts Fund ${index + 1}`,
    }));
    const buffer = await renderGrantBoardReportPdfBuffer({ ...data, applications }, brand);
    const loadingTask = getDocument({ data: new Uint8Array(buffer), disableFontFace: true, useSystemFonts: true });
    const document = await loadingTask.promise;
    try {
      expect(document.numPages).toBeGreaterThan(2);
      for (let pageNumber = 2; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        expect(text).toContain("Grant Board Report");
        expect(text).toContain(`Page ${pageNumber} of ${document.numPages}`);
        page.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }
  }, 30_000);
});
