import { describe, expect, it } from "vitest";

import { aggregateAnnualResponses } from "@/lib/board-evaluation/prototype-domain";
import { buildBoardEvaluationReportHtml } from "@/lib/board-evaluation/report-html";
import { boardEvaluationSummarySchema, readBoardEvaluationSummary } from "@/lib/board-evaluation/summary-report";

describe("branded Board Evaluation report", () => {
  it("uses the organization brand and escapes user-entered report content", () => {
    const results = aggregateAnnualResponses({ responses: [], invited: 6 });
    const html = buildBoardEvaluationReportHtml({
      organizationName: "Olive & Oak",
      year: 2026,
      primaryColor: "#123456",
      secondaryColor: "#D2571C",
      results,
      themes: ["<script>alert(1)</script>"],
      priorities: [{ title: "Improve <controls>", owner: "Finance", dueOn: "2027-01-01", measure: "Review monthly" }],
      notes: "Next year",
      french: false,
    });
    expect(html).toContain("Olive &amp; Oak");
    expect(html).toContain("#123456");
    expect(html).toContain("#D2571C");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("Small samples are suppressed");
  });

  it("retains the HTML summary fields and renders them in English and French", () => {
    const results = aggregateAnnualResponses({ responses: [], invited: 6 });
    const report = readBoardEvaluationSummary({}, { openedOn: "2026-10-01", closedOn: "2026-10-20" });
    report.preparedBy = "Pat Chair";
    report.changeVsPrior[0] = "+0.30";
    report.themeDetails[0][0] = { pattern: "Clearer agendas", frequency: "4 of 6" };
    report.themeDetails[0][1] = { pattern: "Earlier materials", frequency: "2 of 6" };
    report.priorities[0] = { ...report.priorities[0], section: "Governance", average: "3.25",
      issue: "Late agenda <drafts>", suggestedActions: "Send five days early",
      responsible: { boardChair: true, governanceCommittee: true, ed: false, other: false, otherName: "" },
      dueOn: "2027-01-15", checkInOn: "2027-07-15", measure: "On-time packages" };
    expect(boardEvaluationSummarySchema.safeParse(report).success).toBe(true);
    for (const french of [false, true]) {
      const html = buildBoardEvaluationReportHtml({ organizationName: "Olea QA", year: 2026,
        primaryColor: "#123456", secondaryColor: "#D2571C", results, ...report, french });
      expect(html).toContain("Pat Chair");
      expect(html).toContain("2026-10-01");
      expect(html).toContain("+0.30");
      expect(html).toContain("% 4–5");
      expect(html).toContain("Earlier materials");
      expect(html).toMatch(/Theme 2:<\/strong> Earlier materials|Thème 2:<\/strong> Earlier materials/);
      expect(html).toContain("2 of 6");
      expect(html).toMatch(/<tr><th>(Overall|Ensemble)<\/th><td>0<\/td>/);
      expect(html).toContain("&lt;drafts&gt;");
      expect(html).toContain("Send five days early");
      expect(html).toContain("2027-07-15");
      expect(html).toContain(french ? "Comité de gouvernance" : "Governance Committee");
    }
  });

  it("validates scores and dates and retains an existing summary", () => {
    const old = readBoardEvaluationSummary({ themes: ["Keep meetings short"], priorities: [
      { title: "Improve minutes", owner: "Finance lead", dueOn: "2027-01-01", checkInOn: "", measure: "Approved sooner" },
    ] });
    expect(old.themeDetails[0][0].pattern).toBe("Keep meetings short");
    expect(old.priorities[0].suggestedActions).toBe("Improve minutes");
    expect(old.priorities[0].responsible.otherName).toBe("Finance lead");
    expect(boardEvaluationSummarySchema.safeParse(old).success).toBe(true);
    expect(boardEvaluationSummarySchema.safeParse({ ...old, changeVsPrior: ["7", ...old.changeVsPrior.slice(1)] }).success).toBe(false);
    expect(boardEvaluationSummarySchema.safeParse({ ...old, openedOn: "2026-10-20", closedOn: "2026-10-01" }).success).toBe(false);
  });
});
