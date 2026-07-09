import { createTemplateRecordId } from "@/lib/template-renderer/create-id";
import type { TemplateFormData } from "@/lib/template-renderer/types";

type TemplateRecord = Record<string, unknown>;

export interface BoardPackageDocumentInput {
  category: string;
  confidential: boolean;
  meetingId?: string;
  name: string;
  sizeLabel?: string;
  uploadedAt?: string;
  url: string;
}

export interface BoardPackageDocument {
  category: string;
  confidential: boolean;
  id: string;
  meetingId: string;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  url: string;
}

export interface BoardPackageMeeting {
  date: string;
  documentCount: number;
  documents: BoardPackageDocument[];
  id: string;
  time: string;
  title: string;
  type: string;
}

export interface BoardPackageAccessLogInput {
  action: "document_downloaded" | "package_downloaded" | "document_deleted";
  documentId?: string;
  documentName?: string;
  meetingId?: string;
  meetingTitle?: string;
}

export interface BoardPackageAccessLog {
  action: string;
  createdAt: string;
  documentId: string;
  documentName: string;
  id: string;
  meetingId: string;
  meetingTitle: string;
}

function isRecord(value: unknown): value is TemplateRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRows(data: TemplateFormData, key: string): TemplateRecord[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(isRecord);
}

function getString(record: TemplateRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function getBoolean(record: TemplateRecord, key: string) {
  return record[key] === true;
}

function getDocumentMeetingId(record: TemplateRecord) {
  return getString(record, "meeting_id") || getString(record, "meetingId");
}

function getMeetingPackageId(meeting: TemplateRecord, index: number) {
  return getString(meeting, "id") || `meeting-${index}`;
}

function getMeetingTitle(meeting: TemplateRecord) {
  return (
    getString(meeting, "committee") ||
    getString(meeting, "title") ||
    getString(meeting, "type") ||
    "Untitled meeting"
  );
}

export function getBoardPackageDocuments(
  data: TemplateFormData,
): BoardPackageDocument[] {
  return getRows(data, "documents").map((document, index) => ({
    category: getString(document, "category") || "Board package",
    confidential: getBoolean(document, "confidential"),
    id: getString(document, "id") || `document-${index}`,
    meetingId: getDocumentMeetingId(document),
    name: getString(document, "name") || "Untitled document",
    sizeLabel: getString(document, "size_label") || getString(document, "size") || "",
    uploadedAt:
      getString(document, "uploaded_at") ||
      getString(document, "uploadedAt") ||
      "",
    url: getString(document, "url"),
  }));
}

export function getBoardPackageAccessLogs(
  data: TemplateFormData,
): BoardPackageAccessLog[] {
  return getRows(data, "access_log").map((log, index) => ({
    action: getString(log, "action"),
    createdAt: getString(log, "created_at"),
    documentId: getString(log, "document_id"),
    documentName: getString(log, "document_name"),
    id: getString(log, "id") || `access-log-${index}`,
    meetingId: getString(log, "meeting_id"),
    meetingTitle: getString(log, "meeting_title"),
  }));
}

export function buildBoardPackageMeetings(
  data: TemplateFormData,
): BoardPackageMeeting[] {
  const documents = getBoardPackageDocuments(data);

  return getRows(data, "meetings").map((meeting, index) => {
    const id = getMeetingPackageId(meeting, index);
    const meetingDocuments = documents.filter(
      (document) => document.meetingId === id,
    );

    return {
      date: getString(meeting, "date"),
      documentCount: meetingDocuments.length,
      documents: meetingDocuments,
      id,
      time: getString(meeting, "time"),
      title: getMeetingTitle(meeting),
      type: getString(meeting, "type"),
    };
  });
}

export function getGeneralBoardPackageDocuments(data: TemplateFormData) {
  return getBoardPackageDocuments(data).filter((document) => !document.meetingId);
}

export function appendBoardPackageDocument(
  data: TemplateFormData,
  input: BoardPackageDocumentInput,
): TemplateFormData {
  const documents = getRows(data, "documents");

  return {
    ...data,
    documents: [
      ...documents,
      {
        category: input.category.trim() || "Board package",
        confidential: input.confidential,
        id: createTemplateRecordId("document"),
        meeting_id: input.meetingId ?? "",
        name: input.name.trim(),
        size_label: input.sizeLabel?.trim() ?? "",
        uploaded_at: input.uploadedAt ?? new Date().toISOString(),
        url: input.url.trim(),
      },
    ],
  };
}

export function deleteBoardPackageDocument(
  data: TemplateFormData,
  documentId: string,
): TemplateFormData {
  return {
    ...data,
    documents: getRows(data, "documents").filter(
      (document, index) =>
        (getString(document, "id") || `document-${index}`) !== documentId,
    ),
  };
}

export function appendBoardPackageAccessLog(
  data: TemplateFormData,
  input: BoardPackageAccessLogInput,
): TemplateFormData {
  const accessLog = getRows(data, "access_log");

  return {
    ...data,
    access_log: [
      {
        action: input.action,
        created_at: new Date().toISOString(),
        document_id: input.documentId ?? "",
        document_name: input.documentName ?? "",
        id: createTemplateRecordId("access-log"),
        meeting_id: input.meetingId ?? "",
        meeting_title: input.meetingTitle ?? "",
      },
      ...accessLog,
    ],
  };
}
