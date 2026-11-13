import "server-only";

import { isDeepStrictEqual } from "node:util";
import { z } from "zod";

import { isBoardPackageStoragePathForSession, BOARD_PACKAGE_DOCUMENTS_BUCKET } from "@/lib/template-renderer/board-calendar-storage";
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { createAdminClient } from "@/utils/supabase/admin";

type DocumentRow = Record<string, unknown>;
const newDocumentKeys = new Set([
  "id", "category", "content_type", "confidential", "file_name", "meeting_id",
  "name", "size", "size_label", "storage_path", "uploaded_at", "url",
]);

function documentRows(data: TemplateFormData): DocumentRow[] {
  if (data.documents === undefined) return [];
  if (!Array.isArray(data.documents) || data.documents.length > 400) {
    throw new Error("Invalid board package documents.");
  }
  return data.documents.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Invalid board package document.");
    }
    return row as DocumentRow;
  });
}

export async function assertChairPackageDocumentWrite({
  before,
  after,
  organizationId,
  templateInstanceId,
}: {
  before: TemplateFormData;
  after: TemplateFormData;
  organizationId: string;
  templateInstanceId: string;
}) {
  const existing = new Map(documentRows(before).map((row) => [row.id, row]));
  const meetingIds = new Set(buildBoardPackageMeetings(before).map((meeting) => meeting.id));
  const next = documentRows(after);
  const ids = new Set<unknown>();
  for (const row of next) {
    if (typeof row.id !== "string" || !row.id || ids.has(row.id)) {
      throw new Error("Board package documents need unique identifiers.");
    }
    ids.add(row.id);
    const prior = existing.get(row.id);
    if (prior) {
      if (!isDeepStrictEqual(prior, row)) {
        throw new Error("Committee Chairs cannot change existing package document metadata.");
      }
      continue;
    }
    if (typeof row.storage_path !== "string"
      || Object.keys(row).some((key) => !newDocumentKeys.has(key))
      || !isBoardPackageStoragePathForSession({ organizationId, templateInstanceId, storagePath: row.storage_path })
      || row.confidential !== true || row.url !== ""
      || typeof row.name !== "string" || !row.name.trim() || row.name.length > 200
      || typeof row.category !== "string" || !row.category.trim() || row.category.length > 100
      || typeof row.file_name !== "string" || !row.file_name.trim() || row.file_name.length > 255
      || typeof row.size !== "number" || !Number.isInteger(row.size) || row.size < 0 || row.size > 25 * 1024 * 1024
      || typeof row.meeting_id !== "string" || (row.meeting_id !== "" && !meetingIds.has(row.meeting_id))
      || typeof row.uploaded_at !== "string" || !z.iso.datetime().safeParse(row.uploaded_at).success) {
      throw new Error("Committee Chairs may add confidential files uploaded to this calendar only.");
    }
    const { data: stored, error } = await createAdminClient().storage
      .from(BOARD_PACKAGE_DOCUMENTS_BUCKET).info(row.storage_path);
    if (error || !stored) {
      throw new Error("The uploaded board package file was not found.");
    }
  }
}
