import { describe, expect, it } from "vitest";

import {
  appendBoardPackageAccessLog,
  appendBoardPackageDocument,
  buildBoardPackageMeetings,
  deleteBoardPackageDocument,
  getBoardPackageAccessLogs,
  getBoardPackageDocuments,
  getGeneralBoardPackageDocuments,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";

describe("board calendar package helpers", () => {
  const templateData: TemplateFormData = {
    meetings: [
      {
        id: "meeting-q3",
        date: "2026-07-15",
        type: "Board Meeting",
        committee: "Q3 Board Meeting",
        time: "18:00",
      },
      {
        id: "meeting-finance",
        date: "2026-08-10",
        type: "Committee Meeting",
        committee: "Finance Committee",
      },
    ],
    documents: [
      {
        id: "doc-agenda",
        meeting_id: "meeting-q3",
        name: "Q3 board agenda",
        category: "Agenda",
        confidential: true,
        url: "https://example.com/agenda",
      },
      {
        id: "doc-policy",
        meeting_id: "",
        name: "Governance policy",
        category: "Policy",
        confidential: false,
        url: "https://example.com/policy",
      },
    ],
  };

  it("groups package documents by meeting and keeps general documents separate", () => {
    expect(buildBoardPackageMeetings(templateData)).toEqual([
      {
        date: "2026-07-15",
        documentCount: 1,
        documents: [
          {
            category: "Agenda",
            confidential: true,
            id: "doc-agenda",
            meetingId: "meeting-q3",
            name: "Q3 board agenda",
            sizeLabel: "",
            uploadedAt: "",
            url: "https://example.com/agenda",
          },
        ],
        id: "meeting-q3",
        time: "18:00",
        title: "Q3 Board Meeting",
        type: "Board Meeting",
      },
      {
        date: "2026-08-10",
        documentCount: 0,
        documents: [],
        id: "meeting-finance",
        time: "",
        title: "Finance Committee",
        type: "Committee Meeting",
      },
    ]);

    expect(getGeneralBoardPackageDocuments(templateData)).toMatchObject([
      {
        id: "doc-policy",
        meetingId: "",
        name: "Governance policy",
      },
    ]);
  });

  it("adds and removes board package documents without touching other data", () => {
    const withDocument = appendBoardPackageDocument(templateData, {
      category: "Minutes",
      confidential: true,
      meetingId: "meeting-finance",
      name: "Finance minutes",
      sizeLabel: "v1",
      url: "https://example.com/minutes",
    });

    const documents = getBoardPackageDocuments(withDocument);
    const addedDocument = documents.find(
      (document) => document.name === "Finance minutes",
    );

    expect(addedDocument).toMatchObject({
      category: "Minutes",
      confidential: true,
      meetingId: "meeting-finance",
      name: "Finance minutes",
      sizeLabel: "v1",
      url: "https://example.com/minutes",
    });
    expect(withDocument.meetings).toBe(templateData.meetings);

    const afterDelete = deleteBoardPackageDocument(
      withDocument,
      addedDocument?.id ?? "",
    );

    expect(
      getBoardPackageDocuments(afterDelete).some(
        (document) => document.name === "Finance minutes",
      ),
    ).toBe(false);
  });

  it("prepends audit log entries for package activity", () => {
    const withLog = appendBoardPackageAccessLog(templateData, {
      action: "document_downloaded",
      documentId: "doc-agenda",
      documentName: "Q3 board agenda",
      meetingId: "meeting-q3",
      meetingTitle: "Q3 Board Meeting",
    });

    expect(getBoardPackageAccessLogs(withLog)[0]).toMatchObject({
      action: "document_downloaded",
      documentId: "doc-agenda",
      documentName: "Q3 board agenda",
      meetingId: "meeting-q3",
      meetingTitle: "Q3 Board Meeting",
    });
  });
});
