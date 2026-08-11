import { describe, expect, it } from "vitest";

import { renderAccreditationPdfBuffer } from "@/lib/accreditation/pdf-export";
import type { AccreditationWorkspaceData } from "@/lib/accreditation/types";

describe("accreditation PDF export", () => {
  it("renders a PDF buffer for the workspace summary", async () => {
    const data: AccreditationWorkspaceData = {
      configured: true,
      completionPercent: 50,
      instanceId: "instance-1",
      lastUpdatedAt: "2026-08-05T12:00:00.000Z",
      resourceId: "resource-1",
      responses: [
        {
          approvalStatus: "board_approved",
          documentMode: "have",
          evidenceFile: null,
          evidenceLocation: "Board Drive",
          evidenceName: "Conflict of interest policy.pdf",
          notes: "Ready",
          templateId: "A4",
          textDraft: "",
          updatedAt: "2026-08-05T12:00:00.000Z",
        },
      ],
      sections: [
        {
          id: "A",
          name: "Board Governance",
          description: "Governance and board policies",
          approved: 1,
          completed: 1,
          readyForBoard: 0,
          total: 1,
        },
      ],
      settings: {
        charityNumber: "123456789RR0001",
        leadEmail: "chair@example.org",
        leadName: "Board Chair",
        organizationName: "Olea Connects",
        targetDate: "2026-12-31",
        teamRoles: ["Board Chair"],
      },
      templates: [
        {
          boardApprovalRequired: true,
          checklist: ["Current and approved"],
          code: "A4",
          commonMistakes: [],
          defaultDraft: "",
          icRequirement: "Conflict of interest policy",
          kind: "policy",
          sectionId: "A",
          structure: ["Purpose"],
          title: "Conflict of Interest",
          whoCompletes: "Board Chair",
        },
      ],
      totals: {
        approved: 1,
        boardApprovalNeeded: 1,
        completed: 1,
        readyForBoard: 0,
        total: 1,
      },
    };

    const buffer = await renderAccreditationPdfBuffer(data, {
      organizationName: "Olea Connects",
      logoInitials: "OC",
      primaryColor: "#14532d",
      secondaryColor: "#dcfce7",
      website: "",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
