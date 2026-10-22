"use client";

import {
  createBoardPackageDocumentDownloadUrl,
  deleteBoardPackageDocumentFile,
  recordBoardPackageAuditEvent,
  uploadBoardPackageDocument,
} from "@/app/modules/board-calendar/actions";
import type {
  BoardPackageDocument,
  BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";

type DocumentMeetingContext = {
  meetingId?: string;
  meetingTitle: string;
};

export async function uploadSelectedBoardPackageFile({
  file,
  meetingId,
  templateInstanceId,
}: {
  file: File;
  meetingId?: string;
  templateInstanceId: string;
}) {
  const formData = new FormData();
  formData.set("templateInstanceId", templateInstanceId);
  if (meetingId) formData.set("meetingId", meetingId);
  formData.set("file", file);

  return uploadBoardPackageDocument(formData);
}

export function validateBoardPackageDocumentForm({
  file,
  name,
  templateInstanceId,
  url,
}: {
  file: File | null;
  name: string;
  templateInstanceId: string;
  url: string;
}) {
  if (!name) return "Document name is required.";
  if (!file && !url) return "Upload a private file or add an external document link.";
  if (file && !templateInstanceId) {
    return "Save this board calendar before uploading private files.";
  }

  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    if (["http:", "https:"].includes(parsedUrl.protocol)) return "";
  } catch {
    return "Enter a valid document URL.";
  }

  return "Use an http or https document link.";
}

export async function getBoardPackageDocumentOpenUrl({
  document,
  meeting,
  templateInstanceId,
}: {
  document: BoardPackageDocument;
  meeting?: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  if (document.storagePath) {
    return getStoredBoardPackageDocumentUrl({
      document,
      meeting,
      templateInstanceId,
    });
  }

  if (!document.url) {
    throw new Error("This document does not have a downloadable file.");
  }

  await recordExternalDocumentDownload({
    document,
    meeting,
    templateInstanceId,
  });

  return document.url;
}

export async function recordBoardPackageDownload({
  meeting,
  templateInstanceId,
}: {
  meeting: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  if (!templateInstanceId) return;

  const auditResult = await recordBoardPackageAuditEvent({
    action: "package_downloaded",
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    templateInstanceId,
  });

  if (!auditResult.ok) throw new Error(auditResult.error);
}

export async function deleteBoardPackageDocumentWithAudit({
  document,
  meeting,
  templateInstanceId,
}: {
  document: BoardPackageDocument;
  meeting?: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  if (document.storagePath) {
    await deleteStoredBoardPackageDocument({
      document,
      meeting,
      templateInstanceId,
    });
    return;
  }

  await recordExternalDocumentDelete({
    document,
    meeting,
    templateInstanceId,
  });
}

export function getDocumentMeetingContext(
  document: BoardPackageDocument,
  meeting?: BoardPackageMeeting,
): DocumentMeetingContext {
  return {
    meetingId: meeting?.id ?? document.meetingId,
    meetingTitle: meeting?.title ?? "",
  };
}

async function getStoredBoardPackageDocumentUrl({
  document,
  meeting,
  templateInstanceId,
}: {
  document: BoardPackageDocument;
  meeting?: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  const documentUrlResult = await createBoardPackageDocumentDownloadUrl({
    documentId: document.id,
    documentName: document.name,
    fileName: document.fileName || document.name,
    storagePath: document.storagePath,
    templateInstanceId,
    ...getDocumentMeetingContext(document, meeting),
  });

  if (!documentUrlResult.ok) throw new Error(documentUrlResult.error);

  return documentUrlResult.data.signedUrl;
}

async function recordExternalDocumentDownload({
  document,
  meeting,
  templateInstanceId,
}: {
  document: BoardPackageDocument;
  meeting?: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  if (!templateInstanceId) return;

  const auditResult = await recordBoardPackageAuditEvent({
    action: "document_downloaded",
    documentId: document.id,
    documentName: document.name,
    templateInstanceId,
    ...getDocumentMeetingContext(document, meeting),
  });

  if (!auditResult.ok) throw new Error(auditResult.error);
}

async function deleteStoredBoardPackageDocument({
  document,
  meeting,
  templateInstanceId,
}: {
  document: BoardPackageDocument;
  meeting?: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  const deleteResult = await deleteBoardPackageDocumentFile({
    documentId: document.id,
    documentName: document.name,
    storagePath: document.storagePath,
    templateInstanceId,
    ...getDocumentMeetingContext(document, meeting),
  });

  if (!deleteResult.ok) throw new Error(deleteResult.error);
}

async function recordExternalDocumentDelete({
  document,
  meeting,
  templateInstanceId,
}: {
  document: BoardPackageDocument;
  meeting?: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  if (!templateInstanceId) return;

  const auditResult = await recordBoardPackageAuditEvent({
    action: "document_deleted",
    documentId: document.id,
    documentName: document.name,
    templateInstanceId,
    ...getDocumentMeetingContext(document, meeting),
  });

  if (!auditResult.ok) throw new Error(auditResult.error);
}
