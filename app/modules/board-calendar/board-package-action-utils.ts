import { BOARD_PACKAGE_MAX_FILE_SIZE } from "@/lib/template-renderer/board-calendar-storage";
import { logError } from "@/lib/observability/logger";

import type { BoardPackageAuditAction } from "./actions";

const allowedContentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

const allowedAuditActions = new Set<BoardPackageAuditAction>([
  "document_deleted",
  "document_downloaded",
  "package_downloaded",
]);

export function getOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getRequiredFormValue(formData: FormData, key: string) {
  const value = getOptionalFormValue(formData, key);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

export function getValidatedBoardPackageUpload(formData: FormData) {
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    throw new Error("Choose a board package file to upload.");
  }

  assertUploadFileSize(fileValue);

  const contentType = fileValue.type || "application/octet-stream";
  if (!allowedContentTypes.has(contentType)) {
    throw new Error("Upload a PDF, Word, Excel, text, or image file.");
  }

  return { contentType, file: fileValue };
}

export function assertBoardPackageAuditAction(
  action: string,
): asserts action is BoardPackageAuditAction {
  if (!allowedAuditActions.has(action as BoardPackageAuditAction)) {
    throw new Error("Unsupported board package audit action.");
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

export function getBoardPackageActionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  logError("Board package action failed", error);

  if (/bucket|storage/i.test(message)) {
    return "Board package storage is not ready yet. Please ask an administrator to apply the latest database migration and try again.";
  }

  if (/credentials|service role|configured/i.test(message)) {
    return "Board package storage is not configured for this environment yet.";
  }

  if (/not available|does not belong|another organization|access/i.test(message)) {
    return message;
  }

  if (/choose|empty|25 MB|PDF|Word|Excel|image|file/i.test(message)) {
    return message;
  }

  return "We could not complete this board package action. Please try again.";
}

function assertUploadFileSize(fileValue: File) {
  if (!fileValue.size) {
    throw new Error("The selected file is empty.");
  }

  if (fileValue.size > BOARD_PACKAGE_MAX_FILE_SIZE) {
    throw new Error("Board package documents must be 25 MB or smaller.");
  }
}
