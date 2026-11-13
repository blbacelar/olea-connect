"use server";

import { buildBoardPackageMeetings, getBoardPackageDocuments } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { getBoardCalendarSecurity } from "@/lib/template-renderer/board-calendar-security";
import {
  BOARD_PACKAGE_DOCUMENTS_BUCKET,
  buildBoardPackageStoragePath,
  isBoardPackageStoragePathForSession,
} from "@/lib/template-renderer/board-calendar-storage";
import { requireMemberContext } from "@/lib/data/member-context";
import { canEditBoardCalendarDocuments, effectiveBoardCalendarRole } from "@/lib/board-calendar/access";
import { createAdminClient } from "@/utils/supabase/admin";
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
    const { member, organization } = await requireMemberContext();
    if (!canEditBoardCalendarDocuments(effectiveBoardCalendarRole(member))) throw new Error("Only a Calendar administrator or Committee Chair can upload board package files.");
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
  acknowledged = false,
  documentId,
  fileName,
  meetingId,
  meetingTitle,
  storagePath,
  templateInstanceId,
}: {
  acknowledged?: boolean;
  documentId?: string;
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
    const { data: instance, error: instanceError } = await createAdminClient()
      .from("template_instances").select("form_data,resources!inner(slug)")
      .eq("id", templateInstanceId).eq("organization_id", organization.id)
      .eq("resources.slug", "board-calendar-operational-workflow").single();
    if (instanceError || !instance) throw new Error("This board calendar is unavailable.");
    const document = getBoardPackageDocuments(instance.form_data as TemplateFormData)
      .find((item) => item.storagePath === storagePath && item.id === documentId);
    if (!document) throw new Error("This file is not in the board calendar.");
    const security = getBoardCalendarSecurity(instance.form_data as TemplateFormData);
    if (security.requireAck && document.confidential && !acknowledged) {
      throw new Error("Acknowledge confidentiality before downloading this file.");
    }

    const { data, error } = await createAdminClient()
      .storage.from(BOARD_PACKAGE_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 60, {
        download: document.fileName || fileName || true,
      });

    if (error) throw error;

    if (security.logAccess) await writeBoardPackageAuditLog({
      action: "document_downloaded",
      documentId: document.id,
      documentName: document.name,
      meetingId: document.meetingId || meetingId,
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
    if (!canEditBoardCalendarDocuments(effectiveBoardCalendarRole(member))) throw new Error("Only a Calendar administrator or Committee Chair can delete board package files.");

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
    if (!canEditBoardCalendarDocuments(effectiveBoardCalendarRole(member)) && payload.action === "document_deleted") {
      throw new Error("Only an organization administrator can delete board package documents.");
    }
    await assertTemplateInstanceAccess(payload.templateInstanceId, organization.id);
    if (payload.action === "package_downloaded" || payload.action === "document_downloaded") {
      const { data: calendar, error: calendarError } = await createAdminClient()
        .from("template_instances").select("form_data")
        .eq("id", payload.templateInstanceId).eq("organization_id", organization.id).single();
      if (calendarError || !calendar) throw new Error("This board calendar is unavailable.");
      if (!getBoardCalendarSecurity(calendar.form_data as TemplateFormData).logAccess) return { ok: true };
    }
    if (payload.action === "package_opened") {
      const { data: instance, error } = await createAdminClient()
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
