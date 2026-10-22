import { describe, expect, it } from "vitest";

import { getGrantPlatformApplicationActionState } from "@/lib/grants/workflow";
import { getResourceHref } from "@/lib/modules";
import { buildGrantPlatformTemplate } from "@/lib/templates/grant-platform";

describe("grant platform template content", () => {
  it("returns handoff-based workspace sections for the new template", () => {
    const template = buildGrantPlatformTemplate();

    expect(template.slug).toBe("grant-platform");
    expect(template.name).toBe("Grant Platform Workspace");
    expect(template.category).toBe("Grant Management");
    expect(template.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["dashboard", "pipeline", "coaching", "reports", "settings"]),
    );
    expect(template.sections[0]?.title).toBe("Dashboard");
    expect(template.settingsOptions.map((option) => option.id)).toEqual(
      expect.arrayContaining(["workflow", "reporting", "team-access", "notifications"]),
    );
    expect(template.settingsOptions[0]?.title).toBe("Application workflow");
    expect(template.workflowStages.map((stage) => stage.id)).toEqual(
      expect.arrayContaining(["intake", "drafting", "submission", "review", "decision", "reporting"]),
    );
    expect(template.workflowStages[0]?.title).toBe("Intake and eligibility");
  });

  it("maps the grant platform slug to the module route", () => {
    expect(getResourceHref("grant-platform")).toBe("/modules/grant-platform");
  });

  it("classifies workflow actions from application status", () => {
    expect(getGrantPlatformApplicationActionState("draft")).toMatchObject({
      canEdit: true,
      canWithdraw: true,
      canReview: false,
    });
    expect(getGrantPlatformApplicationActionState("submitted")).toMatchObject({
      canEdit: false,
      canWithdraw: true,
      canReview: true,
    });
    expect(getGrantPlatformApplicationActionState("approved")).toMatchObject({
      canEdit: false,
      canWithdraw: false,
      canReview: false,
    });
  });
});
