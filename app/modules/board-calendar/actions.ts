"use server";

import {
  BOARD_PACKAGE_DOCUMENTS_BUCKET,
  buildBoardPackageStoragePath,
  isBoardPackageStoragePathForSession,
} from "@/lib/template-renderer/board-calendar-storage";
import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  assertBoardPackageAuditAction,
  formatFileSize,
  getBoardPackageActionError,
  getOptionalFormValue,
  getRequiredFormValue,
  getValidatedBoardPackageUpload,
} from "./board-package-action-utils";

export interface BoardPackageUploadedDocument {
  contentType: string;
  fileName: string;
  size: number;
  sizeLabel: string;
  storagePath: string;
}

export type BoardPackageActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { data: Data; ok: true })
  | { error: string; ok: false };

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
): Promise<BoardPackageActionResult<BoardPackageUploadedDocument>> {
  try {
    const { organization } = await requireMemberContext();
    const templateInstanceId = getRequiredFormValue(
      formData,
      "templateInstanceId",
    );
    const { contentType, file } = getValidatedBoardPackageUpload(formData);

    await assertTemplateInstanceAccess(templateInstanceId, organization.id);

    const meetingId = getOptionalFormValue(formData, "meetingId");
    const storagePath = buildBoardPackageStoragePath({
      fileName: file.name,
      meetingId,
      organizationId: organization.id,
      templateInstanceId,
    });
    const buffer = Buffer.from(await file.arrayBuffer());
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(BOARD_PACKAGE_DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    return {
      data: {
        contentType,
        fileName: file.name,
        size: file.size,
        sizeLabel: formatFileSize(file.size),
        storagePath,
      },
      ok: true,
    };
  } catch (error) {
    return {
      error: getBoardPackageActionError(error),
      ok: false,
    };
  }
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
}): Promise<BoardPackageActionResult<{ signedUrl: string }>> {
  try {
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

    return {
      data: { signedUrl: data.signedUrl },
      ok: true,
    };
  } catch (error) {
    return {
      error: getBoardPackageActionError(error),
      ok: false,
    };
  }
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
}): Promise<BoardPackageActionResult> {
  try {
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

    return { ok: true };
  } catch (error) {
    return {
      error: getBoardPackageActionError(error),
      ok: false,
    };
  }
}

export async function recordBoardPackageAuditEvent(
  payload: BoardPackageAuditPayload,
): Promise<BoardPackageActionResult> {
  try {
    const { member, organization } = await requireMemberContext();
    assertBoardPackageAuditAction(payload.action);
    await assertTemplateInstanceAccess(payload.templateInstanceId, organization.id);

    await writeBoardPackageAuditLog({
      ...payload,
      memberId: member.id,
      organizationId: organization.id,
    });

    return { ok: true };
  } catch (error) {
    return {
      error: getBoardPackageActionError(error),
      ok: false,
    };
  }
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
