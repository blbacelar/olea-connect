import "server-only";

import type { TemplateExportRecord, TemplateFieldSchema } from "@/lib/template-renderer/types";
import { createClient } from "@/utils/supabase/server";

import type { requireMemberContext } from "./member-context";

export type TemplateDefinitionRow = {
  renderer_key: string;
  schema_version: number | null;
  field_schema: unknown;
  default_values: unknown;
  supports_pdf: boolean;
  supports_docx: boolean;
};

export type ResourceWithDefinition = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  estimated_minutes: number | null;
  template_definitions: TemplateDefinitionRow | TemplateDefinitionRow[] | null;
};

export type OrganizationContext = Awaited<
  ReturnType<typeof requireMemberContext>
>["organization"];

export type ExistingTemplateInstance = {
  id: string;
  title: string | null;
  status: string | null;
  form_data: unknown;
  branding_snapshot: unknown;
  definition_version: string | null;
  schema_snapshot: unknown;
  completion_percent: number | null;
  last_saved_at: string | null;
  updated_at: string;
};

export type TemplateInstanceSummary = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

export type DirectoryMemberRow = {
  user_id: string;
  email: string;
  full_name: string;
  status: "invited" | "active" | "suspended";
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function fetchTemplateResource(
  supabase: SupabaseServerClient,
  slug: string,
) {
  const { data, error } = await supabase
    .from("resources")
    .select(
      "id, slug, title, summary, description, estimated_minutes, template_definitions(renderer_key, schema_version, field_schema, default_values, supports_pdf, supports_docx)",
    )
    .eq("slug", slug)
    .eq("type", "template")
    .eq("status", "published")
    .maybeSingle<ResourceWithDefinition>();

  if (error) throw error;
  return data;
}

export async function fetchTemplateAccess({
  supabase,
  resourceId,
  organization,
}: {
  supabase: SupabaseServerClient;
  resourceId: string;
  organization: OrganizationContext;
}) {
  const [
    { data: planAccess, error: planAccessError },
    { data: directAccess, error: directAccessError },
  ] = await Promise.all([
    supabase.from("resource_plan_access").select("plan_id").eq("resource_id", resourceId),
    supabase
      .from("organization_resource_access")
      .select("resource_id")
      .eq("organization_id", organization.id)
      .eq("resource_id", resourceId)
      .lte("starts_at", new Date().toISOString())
      .maybeSingle(),
  ]);

  if (planAccessError) throw planAccessError;
  if (directAccessError) throw directAccessError;

  return { planAccess, directAccess };
}

export async function fetchTemplateInstances(
  supabase: SupabaseServerClient,
  organizationId: string,
  resourceId: string,
) {
  const { data, error } = await supabase
    .from("template_instances")
    .select("id, title, status, completion_percent, last_saved_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("resource_id", resourceId)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  return data as TemplateInstanceSummary[] | null;
}

export async function fetchSelectedInstance({
  supabase,
  selectedSessionId,
  organizationId,
  resourceId,
}: {
  supabase: SupabaseServerClient;
  selectedSessionId: string | null;
  organizationId: string;
  resourceId: string;
}) {
  if (!selectedSessionId) {
    return null;
  }

  const { data, error } = await supabase
    .from("template_instances")
    .select(
      "id, title, status, form_data, branding_snapshot, definition_version, schema_snapshot, completion_percent, last_saved_at, updated_at",
    )
    .eq("id", selectedSessionId)
    .eq("organization_id", organizationId)
    .eq("resource_id", resourceId)
    .maybeSingle<ExistingTemplateInstance>();

  if (error) throw error;
  return data;
}

export async function fetchWorkspaceDirectory({
  supabase,
  organizationId,
  schemaSnapshot,
}: {
  supabase: SupabaseServerClient;
  organizationId: string;
  schemaSnapshot: TemplateFieldSchema;
}) {
  if (!schemaSnapshot.presentation?.calendar?.enabled) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_team_directory", {
    target_organization_id: organizationId,
  });

  if (error) throw error;
  return data as DirectoryMemberRow[] | null;
}

export async function fetchTemplateExports(
  supabase: SupabaseServerClient,
  sessionId: string,
  organizationId: string,
) {
  if (!sessionId) {
    return [];
  }

  const { data, error } = await supabase
    .from("template_exports")
    .select("id, format, file_name, generated_at, created_by")
    .eq("template_instance_id", sessionId)
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data as Array<{
    id: string;
    format: TemplateExportRecord["format"];
    file_name: string;
    generated_at: string;
    created_by: string | null;
  }> | null;
}
