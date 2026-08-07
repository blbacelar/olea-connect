const GRANT_ATTACHMENTS_BUCKET = "grant-attachments";
const MAX_GRANT_ATTACHMENT_SIZE = 25 * 1024 * 1024;

const allowedGrantAttachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);

const blockedGrantAttachmentExtensions = new Set([".exe", ".js", ".mjs", ".ts", ".tsx", ".html", ".htm"]);

export function buildGrantAttachmentStoragePath(
  organizationId: string,
  grantId: string,
  fileName: string,
) {
  return [organizationId, grantId, `${Date.now()}-${safeFileName(fileName)}`].join("/");
}

export function validateGrantAttachmentFile(file: File) {
  if (file.size > MAX_GRANT_ATTACHMENT_SIZE) {
    throw new Error("Grant files must be 25 MB or smaller.");
  }

  const extension = getFileExtension(file.name);
  if (blockedGrantAttachmentExtensions.has(extension)) {
    throw new Error("HTML, JavaScript, and executable files are not accepted as grant attachments.");
  }

  if (!file.type || !allowedGrantAttachmentTypes.has(file.type)) {
    throw new Error("Upload PDF, Word, Excel, PowerPoint, image, CSV, or plain text grant files only.");
  }
}

export function getGrantAttachmentBucket() {
  return GRANT_ATTACHMENTS_BUCKET;
}

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || "attachment";
}

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionStart = normalizedName.lastIndexOf(".");
  return extensionStart >= 0 ? normalizedName.slice(extensionStart) : "";
}
