import { randomUUID } from "node:crypto";

export const BOARD_PACKAGE_DOCUMENTS_BUCKET = "board-package-documents";
export const BOARD_PACKAGE_MAX_FILE_SIZE = 25 * 1024 * 1024;

const unsafeFileNameCharacters = /[^a-zA-Z0-9._-]+/g;

export function sanitizeBoardPackageFileName(fileName: string) {
  const sanitized = fileName
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(unsafeFileNameCharacters, "-")
    .replace(/-+/g, "-")
    .replace(/(^[.-]+|[.-]+$)/g, "");

  return sanitized || "board-package-document";
}

export function buildBoardPackageStoragePath({
  fileName,
  meetingId,
  organizationId,
  templateInstanceId,
}: {
  fileName: string;
  meetingId?: string;
  organizationId: string;
  templateInstanceId: string;
}) {
  const safeFileName = sanitizeBoardPackageFileName(fileName);
  const safeMeetingId = sanitizeBoardPackageFileName(meetingId || "general");

  return [
    "workspaces",
    organizationId,
    "board-calendar",
    templateInstanceId,
    safeMeetingId,
    `${randomUUID()}-${safeFileName}`,
  ].join("/");
}

export function isBoardPackageStoragePathForSession({
  organizationId,
  storagePath,
  templateInstanceId,
}: {
  organizationId: string;
  storagePath: string;
  templateInstanceId: string;
}) {
  return storagePath.startsWith(
    `workspaces/${organizationId}/board-calendar/${templateInstanceId}/`,
  );
}
