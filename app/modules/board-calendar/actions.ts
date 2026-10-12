"use server";

import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import {
  BOARD_PACKAGE_DOCUMENTS_BUCKET,
  buildBoardPackageStoragePath,
  isBoardPackageStoragePathForSession,
} from "@/lib/template-renderer/board-calendar-storage";
import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { assertTemplateInstanceAccess, writeBoardPackageAuditLog } from "./board-calendar-action-support";
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
  | "package_downloaded"
  | "package_opened"
  | "package_sent";

export interface BoardPackageAuditPayload {
  action: BoardPackageAuditAction;
  documentId?: string;
  documentName?: string;
  meetingId?: string;
  meetingTitle?: string;
  templateInstanceId: string;
  recipientUserId?: string;
  recipientEmail?: string;
  deliveryKey?: string;
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
    if (payload.action === "package_opened") {
      const { data: instance, error } = await (await createClient())
        .from("template_instances")
        .select("form_data")
        .eq("id", payload.templateInstanceId)
        .eq("organization_id", organization.id)
        .single();
      if (error || !instance || !buildBoardPackageMeetings(instance.form_data as TemplateFormData)
        .some((meeting) => meeting.id === payload.meetingId && meeting.documents.length)) {
        throw new Error("This board package is not available.");
      }
    }

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
