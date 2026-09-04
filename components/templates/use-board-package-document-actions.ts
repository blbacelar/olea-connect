"use client";

import { useState } from "react";

import {
  appendBoardPackageAccessLog,
  deleteBoardPackageDocument,
  type BoardPackageDocument,
  type BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";

import {
  deleteBoardPackageDocumentWithAudit,
  getBoardPackageDocumentOpenUrl,
  getDocumentMeetingContext,
} from "./board-package-operations";

type DataChangeHandler = (
  updater: (currentData: TemplateFormData) => TemplateFormData,
) => void;

export function useBoardPackageDocumentActions({
  meetings,
  onDataChange,
  templateInstanceId,
}: {
  meetings: BoardPackageMeeting[];
  onDataChange: DataChangeHandler;
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
  ) {
    setDownloadError("");

    try {
      const documentUrl = await getBoardPackageDocumentOpenUrl({
        document,
        meeting,
        templateInstanceId,
      });
      logDownload(document, meeting);
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
    if (document.confidential) {
      setDownloadTarget(document);
      return;
    }

    void openDocument(document, meeting);
  }

  function confirmConfidentialDownload() {
    if (!downloadTarget) return;
    const meeting = getDocumentMeeting(downloadTarget);
    void openDocument(downloadTarget, meeting);
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
      removeDocumentFromData(deleteTarget, meeting);
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

  function logDownload(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    onDataChange((currentData) =>
      appendBoardPackageAccessLog(currentData, {
        action: "document_downloaded",
        documentId: document.id,
        documentName: document.name,
        ...getDocumentMeetingContext(document, meeting),
      }),
    );
  }

  function removeDocumentFromData(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    onDataChange((currentData) =>
      appendBoardPackageAccessLog(deleteBoardPackageDocument(currentData, document.id), {
        action: "document_deleted",
        documentId: document.id,
        documentName: document.name,
        ...getDocumentMeetingContext(document, meeting),
      }),
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
