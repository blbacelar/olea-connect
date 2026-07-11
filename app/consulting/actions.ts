"use server";

import { revalidatePath } from "next/cache";

import type {
  ConsultingRequestStatus,
  ConsultingRequestType,
  ConsultingRequestUrgency,
} from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "@/lib/data/member-context";

export type ConsultingActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

const requestTypes: ConsultingRequestType[] = [
  "board_package",
  "committee_minutes",
  "governance_support",
  "strategy_call",
  "other",
];
const urgencyLevels: ConsultingRequestUrgency[] = [
  "low",
  "standard",
  "high",
  "urgent",
];
const requestStatuses: ConsultingRequestStatus[] = [
  "submitted",
  "accepted",
  "in_progress",
  "blocked",
  "completed",
  "canceled",
];
const allowedAttachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
const allowedAttachmentExtensions = new Map([
  [".doc", "application/msword"],
  [
    ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".txt", "text/plain"],
  [".xls", "application/vnd.ms-excel"],
  [
    ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
]);
const blockedAttachmentExtensions = new Set([".htm", ".html"]);

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalDateTime(formData: FormData, key: string) {
  const value = getText(formData, key);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Choose a valid date and time.");
  return date.toISOString();
}

function assertOneOf<T extends string>(
  values: readonly T[],
  value: string,
  message: string,
): asserts value is T {
  if (!values.includes(value as T)) throw new Error(message);
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
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

function getRequestAttachments(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function getSafeAttachmentContentType(attachment: File) {
  const extension = getFileExtension(attachment.name);

  if (blockedAttachmentExtensions.has(extension)) {
    throw new Error("HTML files are not accepted as consulting attachments.");
  }

  if (attachment.type && allowedAttachmentTypes.has(attachment.type)) {
    return attachment.type;
  }

  if (attachment.type) {
    throw new Error("Upload PDF, Word, Excel, image, or plain text files only.");
  }

  const extensionContentType = allowedAttachmentExtensions.get(extension);
  if (extensionContentType) return extensionContentType;

  throw new Error("Upload PDF, Word, Excel, image, or plain text files only.");
}

function validateRequestAttachments(attachments: File[]) {
  for (const attachment of attachments) {
    if (attachment.size > 10 * 1024 * 1024) {
      throw new Error("Attachments must be 10 MB or smaller.");
    }
    getSafeAttachmentContentType(attachment);
  }
}

async function uploadRequestAttachments(
  attachments: File[],
  requestId: string,
) {
  if (!attachments.length) return;

  const { member, organization } = await requireMemberContext();
  const admin = createAdminClient();

  for (const attachment of attachments) {
    const fileName = safeFileName(attachment.name);
    const contentType = getSafeAttachmentContentType(attachment);
    const filePath = `${organization.id}/${requestId}/${crypto.randomUUID()}-${fileName}`;
    const { error: uploadError } = await admin.storage
      .from("consulting-attachments")
      .upload(filePath, attachment, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: attachmentError } = await admin
      .from("consulting_request_attachments")
      .insert({
        content_type: contentType,
        file_name: fileName,
        file_path: filePath,
        organization_id: organization.id,
        request_id: requestId,
        size_bytes: attachment.size,
        uploaded_by: member.id,
      });

    if (attachmentError) throw attachmentError;
  }
}

export async function createConsultingRequest(
  _previousState: ConsultingActionState,
  formData: FormData,
): Promise<ConsultingActionState> {
  try {
    const type = getText(formData, "type");
    const urgency = getText(formData, "urgency") || "standard";
    const title = getText(formData, "title");
    const description = getText(formData, "description");
    const attachments = getRequestAttachments(formData);

    assertOneOf(requestTypes, type, "Choose a consulting category.");
    assertOneOf(urgencyLevels, urgency, "Choose a supported urgency.");
    validateRequestAttachments(attachments);

    const supabase = await createClient();
    const { data: requestId, error } = await supabase.rpc(
      "create_consulting_request",
      {
        target_description: description,
        target_title: title,
        target_type: type,
        target_urgency: urgency,
      },
    );

    if (error) throw error;
    if (!requestId) throw new Error("The consulting request could not be created.");

    try {
      await uploadRequestAttachments(attachments, requestId);
    } catch (attachmentError) {
      console.error("Consulting request attachment upload failed", attachmentError);
      revalidatePath("/consulting");
      return {
        message:
          "Consulting request submitted, but one or more attachments could not be uploaded. Please contact support if staff need those files.",
        status: "success",
      };
    }
    revalidatePath("/consulting");

    return {
      message: "Consulting request submitted. Our team can now triage it.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "We could not submit this request."),
      status: "error",
    };
  }
}

export async function updateConsultingRequest(
  _previousState: ConsultingActionState,
  formData: FormData,
): Promise<ConsultingActionState> {
  try {
    const requestId = getText(formData, "requestId");
    const status = getText(formData, "status");
    const assignedTo = getText(formData, "assignedTo") || null;

    assertOneOf(requestStatuses, status, "Choose a supported request status.");

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_consulting_request_operations", {
      target_assigned_to: assignedTo,
      target_due_at: getOptionalDateTime(formData, "dueAt"),
      target_internal_notes: getText(formData, "internalNotes"),
      target_member_notes: getText(formData, "memberNotes"),
      target_request_id: requestId,
      target_scheduled_at: getOptionalDateTime(formData, "scheduledAt"),
      target_status: status,
    });

    if (error) throw error;
    revalidatePath("/consulting");

    return { message: "Consulting request updated.", status: "success" };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "We could not update this request."),
      status: "error",
    };
  }
}

export async function recordConsultingTime(
  _previousState: ConsultingActionState,
  formData: FormData,
): Promise<ConsultingActionState> {
  try {
    const minutes = Number.parseInt(getText(formData, "minutes"), 10);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new Error("Enter time in minutes greater than zero.");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_consulting_time_entry", {
      target_description: getText(formData, "description"),
      target_is_in_kind: formData.get("isInKind") === "on",
      target_minutes: minutes,
      target_request_id: getText(formData, "requestId"),
      target_work_date: getText(formData, "workDate") || null,
    });

    if (error) throw error;
    revalidatePath("/consulting");

    return { message: "Consulting time recorded.", status: "success" };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "We could not record this time entry."),
      status: "error",
    };
  }
}
