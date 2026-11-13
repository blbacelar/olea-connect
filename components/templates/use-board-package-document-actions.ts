"use client";

import { useState } from "react";

import {
  deleteBoardPackageDocument,
  type BoardPackageDocument,
  type BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";

import {
  deleteBoardPackageDocumentWithAudit,
  getBoardPackageDocumentOpenUrl,
} from "./board-package-operations";
import { downloadMeetingDocumentPdf, fetchMeetingDocumentPdf } from "./board-calendar/meeting-pdf-client";

type DataChangeHandler = (
  updater: (currentData: TemplateFormData) => TemplateFormData,
) => void;

export function useBoardPackageDocumentActions({
  meetings,
  onDataChange,
  requireAck,
  templateInstanceId,
}: {
  meetings: BoardPackageMeeting[];
  onDataChange: DataChangeHandler;
  requireAck: boolean;
  templateInstanceId: string;
}) {
  const [downloadTarget, setDownloadTarget] =
    useState<BoardPackageDocument | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<BoardPackageDocument | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [operationError, setOperationError] = useState("");

  async function openDocument(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
    acknowledged = false,
  ) {
    setDownloadError("");

    try {
      if (document.generatedKind && meeting) {
        const pdf = await fetchMeetingDocumentPdf({
          acknowledged,
          kind: document.generatedKind,
          meetingId: meeting.id,
          templateInstanceId,
        });
        downloadMeetingDocumentPdf(pdf.bytes, pdf.fileName);
        return;
      }
      const documentUrl = await getBoardPackageDocumentOpenUrl({
        acknowledged,
        document,
        meeting,
        templateInstanceId,
      });
      window.open(documentUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Unable to open this board package document.",
      );
    }
  }

  function requestDocumentDownload(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    if (requireAck && document.confidential) {
      setDownloadTarget(document);
      return;
    }

    void openDocument(document, meeting);
  }

  function confirmConfidentialDownload() {
    if (!downloadTarget) return;
    const meeting = getDocumentMeeting(downloadTarget);
    void openDocument(downloadTarget, meeting, true);
    setDownloadTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const meeting = getDocumentMeeting(deleteTarget);

    try {
      await deleteBoardPackageDocumentWithAudit({
        document: deleteTarget,
        meeting,
        templateInstanceId,
      });
      removeDocumentFromData(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteTarget(null);
      setOperationError(
        error instanceof Error
          ? error.message
          : "Unable to delete this board package document.",
      );
    }
  }

  function getDocumentMeeting(document: BoardPackageDocument) {
    return meetings.find((item) => item.id === document.meetingId);
  }

  function removeDocumentFromData(document: BoardPackageDocument) {
    onDataChange((currentData) =>
      deleteBoardPackageDocument(currentData, document.id),
    );
  }

  return {
    confirmConfidentialDownload,
    confirmDelete,
    deleteTarget,
    downloadError,
    downloadTarget,
    operationError,
    requestDocumentDownload,
    setDeleteTarget,
    setDownloadError,
    setDownloadTarget,
    setOperationError,
  };
}
