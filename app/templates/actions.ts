"use server";

import { createHash, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getRequestLocale } from "@/lib/i18n/server";
import { requireMemberContext } from "@/lib/data/member-context";
import { canEditBoardCalendarDocuments, canManageBoardCalendar, effectiveBoardCalendarRole } from "@/lib/board-calendar/access";
import { mergeBoardCalendarScopedWrite } from "@/lib/board-calendar/scoped-write";
import { assertChairPackageDocumentWrite } from "@/lib/board-calendar/chair-document-write";
import { buildExportFileName, buildExportStoragePath } from "@/lib/template-renderer/export-files";
import { buildTemplateExportModel } from "@/lib/template-renderer/export-model";
import { renderTemplateDocxBuffer } from "@/lib/template-renderer/docx-export";
import {
  buildBoardCalendarReportFooterText,
  buildBoardCalendarReportHeaderHtml,
  buildBoardCalendarReportHtml,
  isBoardCalendarSchema,
} from "@/lib/template-renderer/board-calendar-report-html";
import { normalizeBoardCalendarMemberAssignments } from "@/lib/template-renderer/board-calendar-chairs";
import { projectBoardCalendarForRole } from "@/lib/template-renderer/board-calendar-member-view";
import { getBoardCalendarContacts } from "@/lib/template-renderer/board-calendar-contacts";
import {
  assertMeetingDocumentWriteAccess,
  assertMeetingDocumentMembers,
  validateMeetingDocuments,
} from "@/lib/template-renderer/board-calendar-meeting-documents";
import { renderHtmlToPdfBuffer } from "@/lib/template-renderer/html-pdf-export";
import { renderTemplatePdfBuffer } from "@/lib/template-renderer/pdf-export";
import { validateTemplateData } from "@/lib/template-renderer/validation";
import type { BrandProfile } from "@/lib/types";
import type {
  DynamicTemplateSession,
  TemplateFieldSchema,
  TemplateExportFormat,
  TemplateFormData,
  TemplateSavePayload,
} from "@/lib/template-renderer/types";
import type { TemplateExportModel } from "@/lib/template-renderer/export-model";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const exportFormats = new Set<TemplateExportFormat>(["pdf", "docx"]);

function assertExportFormat(format: string): asserts format is TemplateExportFormat {
  if (!exportFormats.has(format as TemplateExportFormat)) {
    throw new Error("Unsupported export format.");
  }
}

export async function saveDynamicTemplateSession(
  payload: TemplateSavePayload,
): Promise<DynamicTemplateSession> {
  const { member, organization } = await requireMemberContext();

  if (payload.organizationId !== organization.id) {
    throw new Error("This template belongs to another organization.");
  }

  const supabase = await createClient();
  const calendarRole = effectiveBoardCalendarRole(member);
  const restrictedCalendarResource = payload.resourceId === "10000000-0000-4000-8000-000000000007"
    && !canManageBoardCalendar(calendarRole);
  const writeClient = restrictedCalendarResource ? createAdminClient() : supabase;
  let previousFormData: TemplateFormData | undefined;
  let previousUpdatedAt: string | undefined;
  let restrictedMetadata: {
    title: string;
    status: string;
    schema_snapshot: unknown;
    definition_version: number;
    branding_snapshot: unknown;
    completion_percent: number;
  } | undefined;
  if (payload.id) {
    const { data: existingInstance, error: existingError } = await writeClient
      .from("template_instances")
      .select("resource_id, form_data, title, status, schema_snapshot, definition_version, branding_snapshot, completion_percent, last_saved_at, updated_at")
      .eq("id", payload.id)
      .eq("organization_id", organization.id)
      .single();
    if (existingError || !existingInstance || existingInstance.resource_id !== payload.resourceId) {
      throw new Error("This template session does not belong to the selected resource.");
    }
    previousFormData = existingInstance.form_data as TemplateFormData;
    previousUpdatedAt = existingInstance.updated_at;
    if (restrictedCalendarResource) {
      if (!payload.expectedLastSavedAt || payload.expectedLastSavedAt !== existingInstance.last_saved_at) {
        throw new Error("This calendar changed while you were editing. Reload and try again.");
      }
      restrictedMetadata = {
        title: existingInstance.title,
        status: existingInstance.status,
        schema_snapshot: existingInstance.schema_snapshot,
        definition_version: existingInstance.definition_version,
        branding_snapshot: existingInstance.branding_snapshot,
        completion_percent: existingInstance.completion_percent,
      };
    }
  }
  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .select("slug, template_definitions(default_values)")
    .eq("id", payload.resourceId)
    .single();
  if (resourceError || !resource) throw new Error("This template resource is unavailable.");
  const definition = Array.isArray(resource.template_definitions)
    ? resource.template_definitions[0] : resource.template_definitions;
  const calendarDefaults = definition?.default_values && typeof definition.default_values === "object"
    && !Array.isArray(definition.default_values)
      ? definition.default_values as TemplateFormData : {};
  const isBoardCalendar = resource.slug === "board-calendar-operational-workflow";
  if (isBoardCalendar && calendarRole === "member") {
    throw new Error("This Board Calendar role can view the calendar but cannot edit it.");
  }
  let scopedFormData = payload.formData;
  if (isBoardCalendar && restrictedCalendarResource) {
    if (!previousFormData || !payload.id) {
      throw new Error("Only an organization administrator can create a calendar.");
    }
    scopedFormData = mergeBoardCalendarScopedWrite(previousFormData, payload.formData, calendarRole, calendarDefaults);
  }
  if (isBoardCalendar && calendarRole === "chair" && previousFormData) {
    await assertChairPackageDocumentWrite({
      before: previousFormData,
      after: scopedFormData,
      organizationId: organization.id,
      templateInstanceId: payload.id,
    });
  }
  const calendarData = isBoardCalendar
    ? await normalizeBoardCalendarMemberFormData({
        formData: scopedFormData,
        organizationId: organization.id,
        previousFormData,
        supabase,
      })
    : null;
  const formData = isBoardCalendar && (calendarRole === "chair" || calendarRole === "executive")
    ? scopedFormData
    : calendarData?.formData ?? scopedFormData;
  if (isBoardCalendar) {
    const contacts = getBoardCalendarContacts(formData);
    const previousContacts = previousFormData ? getBoardCalendarContacts(previousFormData) : [];
    if (!canManageBoardCalendar(calendarRole) && JSON.stringify(contacts) !== JSON.stringify(previousContacts)) {
      throw new Error("Only an organization administrator can change the board contact directory.");
    }
    const after = validateMeetingDocuments(formData);
    const before = previousFormData ? validateMeetingDocuments(previousFormData) : [];
    assertMeetingDocumentWriteAccess({
      before,
      after,
      canApprove: canEditBoardCalendarDocuments(calendarRole),
    });
    assertMeetingDocumentMembers({ before, after, activeMemberIds: calendarData?.activeMemberIds ?? [] });
  }
  const validationErrors = validateTemplateData(payload.schemaSnapshot, formData);

  if (payload.status === "completed" && validationErrors.length > 0) {
    throw new Error("Please complete required fields before marking complete.");
  }
  const brandingSnapshot = payload.id
    ? payload.brandingSnapshot
    : await createBrandingSnapshot(supabase, organization.brand);
  const changes = {
    organization_id: organization.id,
    resource_id: payload.resourceId,
    title: payload.title,
    form_data: formData,
    branding_snapshot: brandingSnapshot,
    definition_version: payload.schemaVersion,
    schema_snapshot: payload.schemaSnapshot,
    completion_percent: payload.completionPercent,
    status: payload.status,
    ...(restrictedMetadata ?? {}),
  };

  const updateQuery = payload.id
    ? writeClient
        .from("template_instances")
        .update(changes)
        .eq("id", payload.id)
        .eq("organization_id", organization.id)
    : null;
  const query = updateQuery
    ? restrictedCalendarResource && previousUpdatedAt
      ? updateQuery.eq("updated_at", previousUpdatedAt)
      : updateQuery
    : writeClient.from("template_instances").insert({
        ...changes,
        created_by: member.id,
      });

  const { data, error } = await query
    .select(
      "id, resource_id, organization_id, title, status, form_data, branding_snapshot, definition_version, schema_snapshot, completion_percent, last_saved_at",
    )
    .single();

  if (error) {
    if (restrictedCalendarResource && error.code === "PGRST116") {
      throw new Error("This calendar changed while you were editing. Reload and try again.");
    }
    throw error;
  }

  return {
    id: data.id,
    resourceId: data.resource_id,
    organizationId: data.organization_id,
    title: data.title,
    slug: "",
    schemaVersion: data.definition_version,
    schemaSnapshot: data.schema_snapshot,
    brandingSnapshot: data.branding_snapshot,
    formData: isBoardCalendar ? projectBoardCalendarForRole(data.form_data as TemplateFormData, calendarRole) : data.form_data,
    completionPercent: data.completion_percent,
    status: data.status,
    lastSavedAt: data.last_saved_at,
  } as DynamicTemplateSession;
}

async function normalizeBoardCalendarMemberFormData({
  formData,
  organizationId,
  previousFormData,
  supabase,
}: {
  formData: TemplateFormData;
  organizationId: string;
  previousFormData?: TemplateFormData;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data, error } = await supabase.rpc("get_team_directory", {
    target_organization_id: organizationId,
  });

  if (error) throw error;

  const activeMembers = ((data ?? []) as Array<{
      user_id: string;
      email: string;
      full_name: string;
      status: "invited" | "active" | "suspended";
    }>)
      .filter((directoryMember) => directoryMember.status === "active")
      .map((directoryMember) => ({
        id: directoryMember.user_id,
        email: directoryMember.email,
        name: directoryMember.full_name,
      }));
  return {
    formData: normalizeBoardCalendarMemberAssignments(formData, activeMembers, previousFormData),
    activeMemberIds: activeMembers.map((member) => member.id),
  };
}

export async function generateTemplateExport({
  templateInstanceId,
  format,
}: {
  templateInstanceId: string;
  format: string;
}) {
  assertExportFormat(format);

  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { data: instance, error: instanceError } = await supabase
    .from("template_instances")
    .select(
      "id, organization_id, resource_id, title, status, form_data, branding_snapshot, definition_version, schema_snapshot, resources(title, template_definitions(supports_pdf, supports_docx))",
    )
    .eq("id", templateInstanceId)
    .eq("organization_id", organization.id)
    .single();

  if (instanceError) throw instanceError;

  const resource = Array.isArray(instance.resources)
    ? instance.resources[0]
    : instance.resources;
  if (!canManageBoardCalendar(effectiveBoardCalendarRole(member)) && instance.resource_id === "10000000-0000-4000-8000-000000000007") {
    throw new Error("Only an organization administrator can export the full board calendar report.");
  }
  const definition = Array.isArray(resource?.template_definitions)
    ? resource.template_definitions[0]
    : resource?.template_definitions;

  if (format === "pdf" && !definition?.supports_pdf) {
    throw new Error("This template does not support PDF export.");
  }
  if (format === "docx" && !definition?.supports_docx) {
    throw new Error("This template does not support DOCX export.");
  }

  const model = buildTemplateExportModel({
    schema: instance.schema_snapshot,
    formData: instance.form_data,
  });
  const title = resource?.title ?? instance.title;
  const fileName = buildExportFileName({
    organizationName: organization.name,
    templateName: title,
    format,
  });
  const exportId = randomUUID();
  const storagePath = buildExportStoragePath({
    organizationId: organization.id,
    templateInstanceId: instance.id,
    exportId,
    fileName,
  });
  const buffer =
    format === "pdf"
      ? await renderPdfExportBuffer({
          brand: instance.branding_snapshot,
          formData: instance.form_data,
          model,
          organizationName: organization.name,
          schema: instance.schema_snapshot,
          title,
          locale: await getRequestLocale(),
        })
      : await renderTemplateDocxBuffer({
          title,
          organizationName: organization.name,
          brand: instance.branding_snapshot,
          model,
        });
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const { error: uploadError } = await supabase.storage
    .from("generated-documents")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: exportRecord, error: exportError } = await supabase
    .from("template_exports")
    .insert({
      id: exportId,
      template_instance_id: instance.id,
      organization_id: organization.id,
      resource_id: instance.resource_id,
      created_by: member.id,
      format,
      file_name: fileName,
      storage_path: storagePath,
      definition_version: instance.definition_version,
      schema_snapshot: instance.schema_snapshot,
      form_data_snapshot: instance.form_data,
      branding_snapshot: instance.branding_snapshot,
      checksum_sha256: checksum,
    })
    .select("id, format, file_name, generated_at, created_by")
    .single();

  if (exportError) {
    await createAdminClient()
      .storage.from("generated-documents")
      .remove([storagePath]);
    throw exportError;
  }

  revalidatePath("/templates");
  return {
    id: exportRecord.id,
    format: exportRecord.format as TemplateExportFormat,
    fileName: exportRecord.file_name,
    generatedAt: exportRecord.generated_at,
    generatedBy: exportRecord.created_by as string | null,
  };
}

async function renderPdfExportBuffer({
  brand,
  formData,
  model,
  organizationName,
  schema,
  title,
  locale,
}: {
  brand: BrandProfile;
  formData: TemplateFormData;
  model: TemplateExportModel;
  organizationName: string;
  schema: TemplateFieldSchema;
  title: string;
  locale: Awaited<ReturnType<typeof getRequestLocale>>;
}) {
  if (isBoardCalendarSchema(schema)) {
    return renderHtmlToPdfBuffer(
      buildBoardCalendarReportHtml({
        brand,
        formData,
        organizationName,
        title,
        locale,
      }),
      {
        footerText: buildBoardCalendarReportFooterText(brand, organizationName),
        headerHtml: buildBoardCalendarReportHeaderHtml(organizationName, title, locale),
      },
    );
  }

  return renderTemplatePdfBuffer({
    title,
    organizationName,
    brand,
    model,
  });
}

export async function createTemplateExportDownloadUrl(exportId: string) {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { data: exportRecord, error: exportError } = await supabase
    .from("template_exports")
    .select("id,resource_id")
    .eq("id", exportId)
    .eq("organization_id", organization.id)
    .single();

  if (exportError) throw exportError;
  if (!canManageBoardCalendar(effectiveBoardCalendarRole(member)) && exportRecord.resource_id === "10000000-0000-4000-8000-000000000007") {
    throw new Error("Only an organization administrator can download full board calendar reports.");
  }

  return `/api/template-exports/${exportRecord.id}/download`;
}
