import { describe, expect, it } from "vitest";

import { mergeSavedSession } from "@/hooks/use-dynamic-template-session";
import type { DynamicTemplateSession } from "@/lib/template-renderer/types";

describe("dynamic template session autosave merging", () => {
  it("keeps newer local edits when an older save response resolves", () => {
    const saved = createSession({
      formData: { title: "Budget revi" },
      id: "saved-session",
      lastSavedAt: "2026-06-25T10:00:00.000Z",
      title: "Older server title",
    });
    const current = createSession({
      formData: { title: "Budget review" },
      id: "",
      lastSavedAt: "",
      title: "Newer local title",
    });

    expect(mergeSavedSession(current, saved, true)).toMatchObject({
      formData: { title: "Budget review" },
      id: "saved-session",
      lastSavedAt: "2026-06-25T10:00:00.000Z",
      title: "Newer local title",
    });
  });

  it("accepts the saved snapshot when there are no newer local edits", () => {
    const saved = createSession({
      formData: { title: "Budget review" },
      id: "saved-session",
      lastSavedAt: "2026-06-25T10:00:00.000Z",
      title: "Saved title",
    });
    const current = createSession({
      formData: { title: "Budget revi" },
      id: "",
      lastSavedAt: "",
      title: "Draft title",
    });

    expect(mergeSavedSession(current, saved, false)).toMatchObject({
      formData: { title: "Budget review" },
      id: "saved-session",
      lastSavedAt: "2026-06-25T10:00:00.000Z",
      title: "Saved title",
    });
  });
});

function createSession(
  overrides: Partial<DynamicTemplateSession>,
): DynamicTemplateSession {
  return {
    id: "",
    resourceId: "template-resource",
    organizationId: "organization",
    title: "Draft",
    slug: "board-calendar-operational-workflow",
    schemaVersion: 1,
    schemaSnapshot: {
      version: 1,
      sections: [],
    },
    brandingSnapshot: {
      organizationName: "Olea Test Org",
      logoInitials: "OT",
      primaryColor: "#2f6f4e",
      secondaryColor: "#e0704f",
    },
    formData: {},
    completionPercent: 0,
    status: "draft",
    lastSavedAt: "",
    ...overrides,
  };
}
