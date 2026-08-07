import { describe, expect, it } from "vitest";

import {
  buildGrantPlatformApplicationStatusUpdate,
  getGrantPlatformCollaborationChecklist,
  getGrantPlatformCollaborationNote,
  getGrantPlatformPipelineSnapshot,
  normalizeGrantPlatformRoundStatus,
} from "@/lib/grants/workflow";

describe("grant platform pipeline snapshots", () => {
  it("returns an intake milestone for draft applications", () => {
    const snapshot = getGrantPlatformPipelineSnapshot("draft", "2026-09-15T23:59:59.000Z");

    expect(snapshot.stage).toBe("Intake");
    expect(snapshot.milestone).toContain("evidence");
    expect(snapshot.urgency).toBe("upcoming");
  });

  it("flags overdue review work as urgent", () => {
    const snapshot = getGrantPlatformPipelineSnapshot("submitted", "2024-01-01T00:00:00.000Z");

    expect(snapshot.stage).toBe("Review");
    expect(snapshot.urgency).toBe("urgent");
    expect(snapshot.milestone).toContain("decision");
  });
});

describe("grant platform workflow helpers", () => {
  it("normalizes planning round statuses to the supported grant-round values", () => {
    expect(normalizeGrantPlatformRoundStatus("planning")).toBe("draft");
    expect(normalizeGrantPlatformRoundStatus("in progress")).toBe("upcoming");
  });

  it("builds application updates with a stored collaboration note and timestamps", () => {
    const result = buildGrantPlatformApplicationStatusUpdate("submitted", "Follow up with the board next week.");

    expect(result.status).toBe("submitted");
    expect(result.updates.collaboration_note).toBe("Follow up with the board next week.");
    expect(result.updates.submitted_at).toBeTruthy();
    expect(result.updates.withdrawn_at).toBeNull();
  });
});

describe("grant platform collaboration checklist", () => {
  it("extracts a saved collaboration note from the eligibility snapshot", () => {
    const note = getGrantPlatformCollaborationNote({ collaboration_note: "Follow up with the board next week." });

    expect(note).toBe("Follow up with the board next week.");
  });

  it("returns evidence-focused actions for draft applications", () => {
    const checklist = getGrantPlatformCollaborationChecklist("draft", "2026-09-15T23:59:59.000Z");

    expect(checklist[0]?.title).toContain("Evidence");
    expect(checklist).toHaveLength(3);
  });

  it("returns delivery-focused actions for approved applications", () => {
    const checklist = getGrantPlatformCollaborationChecklist("approved", "2026-09-15T23:59:59.000Z");

    expect(checklist[0]?.title).toContain("Delivery");
  });
});
