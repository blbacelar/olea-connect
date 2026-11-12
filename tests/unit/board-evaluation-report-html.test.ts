import { describe, expect, it } from "vitest";

import { aggregateAnnualResponses } from "@/lib/board-evaluation/prototype-domain";
import { buildBoardEvaluationReportHtml } from "@/lib/board-evaluation/report-html";

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
});
