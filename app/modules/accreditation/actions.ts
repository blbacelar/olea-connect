"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  accreditationResponseSchema,
  accreditationSettingsSchema,
  mergeResponse,
  normalizeResponses,
  normalizeSettings,
} from "@/lib/accreditation/domain";
import type {
  AccreditationTemplateResponse,
  AccreditationWorkspaceData,
} from "@/lib/accreditation/types";
import { getAccreditationWorkspaceData } from "@/lib/data/accreditation";
import { requireMemberContext } from "@/lib/data/member-context";
import { createClient } from "@/utils/supabase/server";

const PATH = "/modules/accreditation";
const ACCREDITATION_EVIDENCE_BUCKET = "accreditation-evidence";
const MAX_EVIDENCE_FILE_SIZE = 15 * 1024 * 1024;
const allowedEvidenceTypes = new Set([
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
const blockedEvidenceExtensions = new Set([".htm", ".html", ".js", ".mjs", ".ts", ".tsx"]);

export type AccreditationActionResult =
  | { ok: true; response?: AccreditationTemplateResponse }
  | { error: string; fieldErrors?: Record<string, string[]>; ok: false };

export async function saveAccreditationSettingsAction(
  formData: FormData,
): Promise<AccreditationActionResult> {
  try {
    const data = await getAccreditationWorkspaceData();
    const parsed = accreditationSettingsSchema.safeParse({
      charityNumber: getString(formData, "charityNumber").toUpperCase(),
      leadEmail: getString(formData, "leadEmail").toLowerCase(),
      leadName: getString(formData, "leadName"),
      organizationName: getString(formData, "organizationName"),
      targetDate: getString(formData, "targetDate"),
      teamRoles: formData.getAll("teamRoles").map(String),
    });

    if (!parsed.success) {
      return zodError(parsed.error);
    }

    await updateWorkspaceFormData(data, {
      configured: true,
      settings: parsed.data,
    });
    revalidatePath(PATH);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveAccreditationTemplateAction(
  formData: FormData,
): Promise<AccreditationActionResult> {
  try {
    const data = await getAccreditationWorkspaceData();
    const templateId = getString(formData, "templateId");
    const template = data.templates.find((item) => item.code === templateId);

    if (!template) {
      return { error: "Choose a valid accreditation template.", ok: false };
    }

    const existingResponse = data.responses.find(
      (response) => response.templateId === template.code,
    );
    const evidenceUpload = getEvidenceUpload(formData);
    const documentMode = getString(formData, "documentMode");
    const evidenceName = getString(formData, "evidenceName") || evidenceUpload?.name || "";
    const evidenceFile =
      documentMode === "have"
        ? evidenceUpload
          ? pendingEvidenceFile(evidenceUpload)
          : existingResponse?.evidenceFile ?? null
        : null;

    const parsed = accreditationResponseSchema.safeParse({
      approvalStatus: template.boardApprovalRequired
        ? getString(formData, "approvalStatus")
        : "not_required",
      documentMode,
      evidenceFile,
      evidenceLocation: getString(formData, "evidenceLocation"),
      evidenceName,
      notes: getString(formData, "notes"),
      templateId,
      textDraft: getString(formData, "textDraft"),
    });

    if (!parsed.success) return zodError(parsed.error);

    const parsedResponse =
      evidenceUpload && parsed.data.documentMode === "have"
        ? {
            ...parsed.data,
            evidenceFile: await uploadEvidenceFile(
              evidenceUpload,
              data.instanceId,
              template.code,
            ),
        }
        : parsed.data;

    const responses = mergeResponse(
      data.responses,
      parsedResponse as Omit<AccreditationTemplateResponse, "updatedAt">,
    );

    await updateWorkspaceFormData(data, { responses });
    revalidatePath(PATH);
    const savedResponse = responses.find((item) => item.templateId === template.code);
    return { ok: true, response: savedResponse };
  } catch (error) {
    return actionError(error);
  }
}

async function updateWorkspaceFormData(
  data: AccreditationWorkspaceData,
  patch: Record<string, unknown>,
) {
  const { organization } = await requireMemberContext();
  const supabase = await createClient();
  const current = {
    configured: data.configured,
    responses: normalizeResponses(data.responses),
    settings: normalizeSettings(data.settings, organization.brand.organizationName),
  };

  const { data: saved, error } = await supabase
    .from("template_instances")
    .update({
      form_data: {
        ...current,
        ...patch,
      },
      status: "draft",
    })
    .eq("id", data.instanceId)
    .eq("organization_id", organization.id)
    .select("id")
    .single();

  if (error) throw error;
  if (!saved) {
    throw new Error("This accreditation workspace no longer exists.");
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getEvidenceUpload(formData: FormData) {
  const value = formData.get("evidenceFile");
  if (!(value instanceof File) || value.size <= 0) return null;
  validateEvidenceFile(value);
  return value;
}

function validateEvidenceFile(file: File) {
  if (file.size > MAX_EVIDENCE_FILE_SIZE) {
    throw new Error("Evidence files must be 15 MB or smaller.");
  }

  const extension = getFileExtension(file.name);
  if (blockedEvidenceExtensions.has(extension)) {
    throw new Error("HTML, JavaScript, and executable code files are not accepted as evidence.");
  }

  if (!file.type || !allowedEvidenceTypes.has(file.type)) {
    throw new Error("Upload PDF, Word, Excel, image, or plain text evidence files only.");
  }
}

async function uploadEvidenceFile(
  file: File,
  instanceId: string,
  templateCode: string,
) {
  const { organization } = await requireMemberContext();
  const supabase = await createClient();
  const storagePath = [
    organization.id,
    "accreditation",
    instanceId,
    templateCode,
    `${Date.now()}-${safeFileName(file.name)}`,
  ].join("/");

  const { data, error } = await supabase.storage
    .from(ACCREDITATION_EVIDENCE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return {
    name: file.name,
    path: data.path,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

function pendingEvidenceFile(
  file: File,
): NonNullable<AccreditationTemplateResponse["evidenceFile"]> {
  return {
    name: file.name,
    path: "pending-upload",
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || "evidence";
}

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionStart = normalizedName.lastIndexOf(".");
  return extensionStart >= 0 ? normalizedName.slice(extensionStart) : "";
}

function zodError(error: z.ZodError): AccreditationActionResult {
  const flattened = z.flattenError(error).fieldErrors;
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened).filter(
      ([, errors]) => Array.isArray(errors) && errors.length > 0,
    ),
  ) as Record<string, string[]>;

  return {
    error: "Check the highlighted fields and try again.",
    fieldErrors,
    ok: false,
  };
}

function actionError(error: unknown): AccreditationActionResult {
  return {
    error:
      error instanceof Error
        ? error.message
        : "We could not save this accreditation workspace right now.",
    ok: false,
  };
}
