import { describe, expect, it } from "vitest";

import {
  accreditationSections,
  accreditationTemplates,
} from "@/lib/accreditation/catalog";
import {
  accreditationResponseSchema,
  accreditationSettingsSchema,
  buildWorkspaceData,
  emptyResponse,
  isResponseComplete,
  mergeResponse,
} from "@/lib/accreditation/domain";

describe("Accreditation preparation workspace domain", () => {
  it("maps the complete document-based Imagine Canada checklist", () => {
    expect(accreditationSections.map((section) => section.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(accreditationTemplates).toHaveLength(36);
    expect(
      accreditationTemplates.filter((template) => template.sectionId === "A"),
    ).toHaveLength(13);
    expect(
      accreditationTemplates.filter((template) => template.sectionId === "B"),
    ).toHaveLength(7);
    expect(
      accreditationTemplates.filter((template) => template.sectionId === "C"),
    ).toHaveLength(5);
    expect(
      accreditationTemplates.filter((template) => template.sectionId === "D"),
    ).toHaveLength(7);
    expect(
      accreditationTemplates.filter((template) => template.sectionId === "E"),
    ).toHaveLength(4);
  });

  it("validates accreditation settings with explicit field formats", () => {
    expect(
      accreditationSettingsSchema.safeParse({
        charityNumber: "123456789RR0001",
        leadEmail: "chair@example.org",
        leadName: "Board Chair",
        organizationName: "BoraPost",
        targetDate: "2026-12-31",
        teamRoles: ["Board Chair"],
      }).success,
    ).toBe(true);

    const invalid = accreditationSettingsSchema.safeParse({
      charityNumber: "123",
      leadEmail: "chair",
      leadName: "Board Chair",
      organizationName: "B",
      targetDate: "2026-02-31",
      teamRoles: [],
    });

    expect(invalid.success).toBe(false);
    expect(invalid.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining([
        "charityNumber",
        "leadEmail",
        "organizationName",
        "targetDate",
      ]),
    );
  });

  it("requires evidence details only when the organization already has the document", () => {
    expect(
      accreditationResponseSchema.safeParse({
        approvalStatus: "not_required",
        documentMode: "have",
        evidenceFile: null,
        evidenceLocation: "Board Drive / Accreditation",
        evidenceName: "Conflict of interest policy.pdf",
        notes: "",
        templateId: "A4",
        textDraft: "",
      }).success,
    ).toBe(true);

    expect(
      accreditationResponseSchema.safeParse({
        approvalStatus: "not_required",
        documentMode: "have",
        evidenceLocation: "",
        evidenceName: "",
        notes: "",
        templateId: "A4",
        textDraft: "",
      }).success,
    ).toBe(false);
  });

  it("requires draft text only when creating a missing document", () => {
    const response = emptyResponse("A4");

    expect(isResponseComplete(response)).toBe(false);
    expect(
      accreditationResponseSchema.safeParse({
        ...response,
        documentMode: "create",
        textDraft: "Conflict disclosure policy draft.",
      }).success,
    ).toBe(true);
    expect(
      accreditationResponseSchema.safeParse({
        ...response,
        documentMode: "create",
        textDraft: "",
      }).success,
    ).toBe(false);
  });

  it("derives progress from saved responses rather than prototype values", () => {
    const responses = mergeResponse([], {
      approvalStatus: "board_approved",
      documentMode: "have",
      evidenceFile: null,
      evidenceLocation: "Board folder",
      evidenceName: "Strategic plan.pdf",
      notes: "",
      templateId: "A2",
      textDraft: "",
    });

    const workspace = buildWorkspaceData({
      configured: true,
      instanceId: "instance-id",
      lastUpdatedAt: "2026-08-04T16:00:00Z",
      resourceId: "resource-id",
      responses,
      settings: {
        charityNumber: "123456789RR0001",
        leadEmail: "chair@example.org",
        leadName: "Board Chair",
        organizationName: "BoraPost",
        targetDate: "2026-12-31",
        teamRoles: ["Board Chair"],
      },
    });

    expect(workspace.totals.completed).toBe(1);
    expect(workspace.totals.total).toBe(36);
    expect(workspace.sections.find((section) => section.id === "A")).toMatchObject({
      completed: 1,
      total: 13,
    });
  });
});
