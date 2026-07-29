import type { TemplateExportFormat } from "./types";

export function buildExportBaseName({
  organizationName,
  templateName,
  date = new Date(),
}: {
  organizationName: string;
  templateName: string;
  date?: Date;
}) {
  const datePart = date.toISOString().slice(0, 10);
  return [organizationName, templateName, datePart]
    .map((part) => sanitizeFilePart(part))
    .filter(Boolean)
    .join("_");
}

export function buildExportFileName({
  organizationName,
  templateName,
  format,
  date = new Date(),
}: {
  organizationName: string;
  templateName: string;
  format: TemplateExportFormat;
  date?: Date;
}) {
  return `${buildExportBaseName({ organizationName, templateName, date })}.${format}`;
}

export function buildExportStoragePath({
  organizationId,
  templateInstanceId,
  exportId,
  fileName,
}: {
  organizationId: string;
  templateInstanceId: string;
  exportId: string;
  fileName: string;
}) {
  return `${organizationId}/${templateInstanceId}/${exportId}/${fileName}`;
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
