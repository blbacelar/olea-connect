"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { validateTemplateData } from "@/lib/template-renderer/validation";
import type {
  DynamicTemplateSession,
  TemplateSavePayload,
} from "@/lib/template-renderer/types";
import { createClient } from "@/utils/supabase/server";

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
