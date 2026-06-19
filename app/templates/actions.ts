"use server";

import { createHash, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { buildExportFileName, buildExportStoragePath } from "@/lib/template-renderer/export-files";
import { buildTemplateExportModel } from "@/lib/template-renderer/export-model";
import { renderTemplateDocxBuffer } from "@/lib/template-renderer/docx-export";
import { renderTemplatePdfBuffer } from "@/lib/template-renderer/pdf-export";
import { validateTemplateData } from "@/lib/template-renderer/validation";
import type {
  DynamicTemplateSession,
  TemplateExportFormat,
  TemplateSavePayload,
} from "@/lib/template-renderer/types";
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

  const validationErrors = validateTemplateData(
    payload.schemaSnapshot,
    payload.formData,
  );

  if (payload.status === "completed" && validationErrors.length > 0) {
    throw new Error("Please complete required fields before marking complete.");
  }

  const supabase = await createClient();
  const changes = {
    organization_id: organization.id,
    resource_id: payload.resourceId,
    title: payload.title,
    form_data: payload.formData,
    branding_snapshot: payload.brandingSnapshot,
    definition_version: payload.schemaVersion,
    schema_snapshot: payload.schemaSnapshot,
    completion_percent: payload.completionPercent,
    status: payload.status,
  };

  const query = payload.id
    ? supabase
        .from("template_instances")
        .update(changes)
        .eq("id", payload.id)
        .eq("organization_id", organization.id)
    : supabase.from("template_instances").insert({
        ...changes,
        created_by: member.id,
      });

  const { data, error } = await query
    .select(
      "id, resource_id, organization_id, title, status, form_data, branding_snapshot, definition_version, schema_snapshot, completion_percent, last_saved_at",
    )
    .single();

  if (error) throw error;

  revalidatePath("/templates");

  return {
    id: data.id,
    resourceId: data.resource_id,
    organizationId: data.organization_id,
    title: data.title,
    slug: "",
    schemaVersion: data.definition_version,
    schemaSnapshot: data.schema_snapshot,
    brandingSnapshot: data.branding_snapshot,
    formData: data.form_data,
    completionPercent: data.completion_percent,
    status: data.status,
    lastSavedAt: data.last_saved_at,
  } as DynamicTemplateSession;
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
      ? await renderTemplatePdfBuffer({
          title,
          organizationName: organization.name,
          brand: instance.branding_snapshot,
          model,
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

export async function createTemplateExportDownloadUrl(exportId: string) {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { data: exportRecord, error: exportError } = await supabase
    .from("template_exports")
    .select("id, organization_id, storage_path, file_name")
    .eq("id", exportId)
    .eq("organization_id", organization.id)
    .single();

  if (exportError) throw exportError;

  const { error: eventError } = await supabase
    .from("template_export_downloads")
    .insert({
      export_id: exportRecord.id,
      organization_id: organization.id,
      downloaded_by: member.id,
      metadata: { file_name: exportRecord.file_name },
    });

  if (eventError) throw eventError;

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from("generated-documents")
    .createSignedUrl(exportRecord.storage_path, 60, {
      download: exportRecord.file_name,
    });

  if (signedUrlError) throw signedUrlError;

  return signedUrl.signedUrl;
}
