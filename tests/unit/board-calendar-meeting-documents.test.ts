import { describe, expect, it } from "vitest";

import {
  assertMeetingDocumentWriteAccess,
  assertMeetingDocumentMembers,
  createMeetingDocument,
  getMeetingDocuments,
  upsertMeetingDocument,
  validateMeetingDocuments,
} from "@/lib/template-renderer/board-calendar-meeting-documents";
import { buildMeetingDocumentHtml } from "@/lib/template-renderer/board-calendar-meeting-document-html";
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";

const meeting = { id: "meeting-1", type: "Board Meeting", committee: "Board review", date: "2026-11-10", time: "13:00" };
const base: TemplateFormData = { meetings: [meeting], documents: [] };

describe("board meeting documents", () => {
  it("keeps drafts out of packages and includes only approved documents", () => {
    const agenda = createMeetingDocument(meeting.id, "consent_agenda", ["member-1"]);
    const draftData = upsertMeetingDocument(base, { ...agenda, sections: { ...agenda.sections, consent: "Approve the prior minutes" } });
    expect(getMeetingDocuments(draftData)).toHaveLength(1);
    expect(buildBoardPackageMeetings(draftData)[0].documents).toHaveLength(0);

    const approvedData = upsertMeetingDocument(draftData, { ...agenda, sections: { ...agenda.sections, consent: "Approve the prior minutes" }, status: "approved" });
    expect(validateMeetingDocuments(approvedData)).toHaveLength(1);
    expect(buildBoardPackageMeetings(approvedData)[0].documents).toMatchObject([
      { name: "Consent agenda", generatedKind: "consent_agenda", confidential: true },
    ]);
  });

  it("records minutes with attendance, motions, vote counts and actions", () => {
    const minutes = createMeetingDocument(meeting.id, "board_minutes", ["member-1"]);
    const completed = {
      ...minutes,
      status: "approved" as const,
      attendance: [{ memberId: "member-1", status: "present" as const }],
      motions: [{ id: "motion-1", text: "Approve the budget", movedBy: "member-1", secondedBy: "", votesFor: 4, votesAgainst: 1, abstentions: 0, outcome: "carried" as const }],
      actions: [{ id: "action-1", description: "Notify finance", ownerId: "member-1", dueDate: "2026-11-20", done: false }],
    };
    const data = upsertMeetingDocument(base, completed);
    expect(validateMeetingDocuments(data)).toHaveLength(1);
    const html = buildMeetingDocumentHtml({
      document: completed,
      meeting: { title: "Board review", date: "2026-11-10", time: "13:00", location: "" },
      memberNames: new Map([["member-1", "Alex Chair"]]),
      organizationName: "Example Org",
    });
    expect(html).toContain("Approve the budget");
    expect(html).toContain("For 4 · Against 1");
    expect(html).toContain("Alex Chair");
  });

  it("rejects approval without content, orphan references, invalid votes, and duplicate documents", () => {
    const agenda = createMeetingDocument(meeting.id, "consent_agenda", []);
    expect(() => validateMeetingDocuments({ ...base, meeting_documents: [{ ...agenda, status: "approved" }] })).toThrow(/Add meeting content/);
    expect(() => validateMeetingDocuments({ ...base, meeting_documents: [{ ...agenda, meetingId: "other" }] })).toThrow(/missing meeting/);
    expect(() => validateMeetingDocuments({ ...base, meeting_documents: [agenda, agenda] })).toThrow(/Duplicate/);
    const minutes = createMeetingDocument(meeting.id, "board_minutes", []);
    expect(() => validateMeetingDocuments({ ...base, meeting_documents: [{ ...minutes, motions: [{ id: "m", text: "Vote", movedBy: "", secondedBy: "", votesFor: -1, votesAgainst: 0, abstentions: 0, outcome: "failed" }] }] })).toThrow();
  });

  it("prevents members from approving or changing approved documents", () => {
    const draft = createMeetingDocument(meeting.id, "consent_agenda", []);
    const approved = { ...draft, status: "approved" as const, sections: { ...draft.sections, consent: "Approve minutes" } };
    expect(() => assertMeetingDocumentWriteAccess({ before: [draft], after: [approved], canApprove: false })).toThrow(/administrator/);
    expect(() => assertMeetingDocumentWriteAccess({ before: [approved], after: [], canApprove: false })).toThrow(/administrator/);
    expect(() => assertMeetingDocumentWriteAccess({ before: [draft], after: [approved], canApprove: true })).not.toThrow();
  });

  it("rejects new foreign participants but retains historical attendance", () => {
    const agenda = createMeetingDocument(meeting.id, "consent_agenda", ["former-member"]);
    expect(() => assertMeetingDocumentMembers({ before: [], after: [agenda], activeMemberIds: ["current-member"] })).toThrow(/workspace/);
    expect(() => assertMeetingDocumentMembers({ before: [agenda], after: [agenda], activeMemberIds: ["current-member"] })).not.toThrow();
  });

  it("escapes meeting content in PDF HTML", () => {
    const agenda = createMeetingDocument(meeting.id, "consent_agenda", []);
    const html = buildMeetingDocumentHtml({
      document: { ...agenda, sections: { ...agenda.sections, consent: "<script>alert(1)</script>" } },
      meeting: { title: "<b>Board</b>", date: "", time: "", location: "" },
      memberNames: new Map(),
      organizationName: "Org",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
