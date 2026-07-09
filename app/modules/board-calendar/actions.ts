"use server";

import {
  BOARD_PACKAGE_DOCUMENTS_BUCKET,
  BOARD_PACKAGE_MAX_FILE_SIZE,
  buildBoardPackageStoragePath,
  isBoardPackageStoragePathForSession,
} from "@/lib/template-renderer/board-calendar-storage";
import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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

export interface BoardPackageUploadedDocument {
  contentType: string;
  fileName: string;
  size: number;
  sizeLabel: string;
  storagePath: string;
}

export type BoardPackageAuditAction =
  | "document_downloaded"
  | "document_deleted"
  | "package_downloaded";

export interface BoardPackageAuditPayload {
  action: BoardPackageAuditAction;
  documentId?: string;
  documentName?: string;
  meetingId?: string;
  meetingTitle?: string;
  templateInstanceId: string;
}

export async function uploadBoardPackageDocument(
  formData: FormData,
): Promise<BoardPackageUploadedDocument> {
  const { organization } = await requireMemberContext();
  const templateInstanceId = getRequiredFormValue(
    formData,
    "templateInstanceId",
  );
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    throw new Error("Choose a board package file to upload.");
  }

  if (!fileValue.size) {
    throw new Error("The selected file is empty.");
  }

  if (fileValue.size > BOARD_PACKAGE_MAX_FILE_SIZE) {
    throw new Error("Board package documents must be 25 MB or smaller.");
  }

  const contentType = fileValue.type || "application/octet-stream";
  if (!allowedContentTypes.has(contentType)) {
    throw new Error("Upload a PDF, Word, Excel, text, or image file.");
  }

  await assertTemplateInstanceAccess(templateInstanceId, organization.id);

  const meetingId = getOptionalFormValue(formData, "meetingId");
  const storagePath = buildBoardPackageStoragePath({
    fileName: fileValue.name,
    meetingId,
    organizationId: organization.id,
    templateInstanceId,
  });
  const buffer = Buffer.from(await fileValue.arrayBuffer());
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BOARD_PACKAGE_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  return {
    contentType,
    fileName: fileValue.name,
    size: fileValue.size,
    sizeLabel: formatFileSize(fileValue.size),
    storagePath,
  };
}

export async function createBoardPackageDocumentDownloadUrl({
  documentId,
  documentName,
  fileName,
  meetingId,
  meetingTitle,
  storagePath,
  templateInstanceId,
}: {
  documentId?: string;
  documentName?: string;
  fileName: string;
  meetingId?: string;
  meetingTitle?: string;
  storagePath: string;
  templateInstanceId: string;
}) {
  const { member, organization } = await requireMemberContext();

  if (
    !isBoardPackageStoragePathForSession({
      organizationId: organization.id,
      storagePath,
      templateInstanceId,
    })
  ) {
    throw new Error("This document does not belong to this board calendar.");
  }

  await assertTemplateInstanceAccess(templateInstanceId, organization.id);

  const { data, error } = await createAdminClient()
    .storage.from(BOARD_PACKAGE_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60, {
      download: fileName || true,
    });

  if (error) throw error;

  await writeBoardPackageAuditLog({
    action: "document_downloaded",
    documentId,
    documentName: documentName || fileName,
    meetingId,
    meetingTitle,
    memberId: member.id,
    organizationId: organization.id,
    templateInstanceId,
  });

  return data.signedUrl;
}

export async function deleteBoardPackageDocumentFile({
  documentId,
  documentName,
  meetingId,
  meetingTitle,
  storagePath,
  templateInstanceId,
}: {
  documentId?: string;
  documentName?: string;
  meetingId?: string;
  meetingTitle?: string;
  storagePath: string;
  templateInstanceId: string;
}) {
  const { member, organization } = await requireMemberContext();

  if (
    !isBoardPackageStoragePathForSession({
      organizationId: organization.id,
      storagePath,
      templateInstanceId,
    })
  ) {
    throw new Error("This document does not belong to this board calendar.");
  }

  await assertTemplateInstanceAccess(templateInstanceId, organization.id);

  const { error } = await createAdminClient()
    .storage.from(BOARD_PACKAGE_DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) throw error;

  await writeBoardPackageAuditLog({
    action: "document_deleted",
    documentId,
    documentName,
    meetingId,
    meetingTitle,
    memberId: member.id,
    organizationId: organization.id,
    templateInstanceId,
  });
}

export async function recordBoardPackageAuditEvent(
  payload: BoardPackageAuditPayload,
) {
  const { member, organization } = await requireMemberContext();
  assertBoardPackageAuditAction(payload.action);
  await assertTemplateInstanceAccess(payload.templateInstanceId, organization.id);

  await writeBoardPackageAuditLog({
    ...payload,
    memberId: member.id,
    organizationId: organization.id,
  });
}

async function assertTemplateInstanceAccess(
  templateInstanceId: string,
  organizationId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_instances")
    .select("id")
    .eq("id", templateInstanceId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    throw new Error("This board calendar is not available to your workspace.");
  }
}

function getRequiredFormValue(formData: FormData, key: string) {
  const value = getOptionalFormValue(formData, key);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function getOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function assertBoardPackageAuditAction(
  action: string,
): asserts action is BoardPackageAuditAction {
  if (!allowedAuditActions.has(action as BoardPackageAuditAction)) {
    throw new Error("Unsupported board package audit action.");
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

async function writeBoardPackageAuditLog({
  action,
  documentId,
  documentName,
  meetingId,
  meetingTitle,
  memberId,
  organizationId,
  templateInstanceId,
}: BoardPackageAuditPayload & {
  memberId: string;
  organizationId: string;
}) {
  const entityType =
    action === "package_downloaded"
      ? "board_package"
      : "board_package_document";
  const entityId = documentId || meetingId || templateInstanceId;
  const { error } = await createAdminClient().from("audit_logs").insert({
    action: `board_package.${action}`,
    actor_user_id: memberId,
    changes: null,
    entity_id: entityId,
    entity_type: entityType,
    metadata: {
      document_id: documentId ?? null,
      document_name: documentName ?? null,
      meeting_id: meetingId ?? null,
      meeting_title: meetingTitle ?? null,
      template_instance_id: templateInstanceId,
    },
    organization_id: organizationId,
  });

  if (error) throw error;
}
