import "server-only";

import { normalizeTemplateSchema } from "@/lib/template-renderer/schema";
import type {
  DynamicTemplateEditorData,
  DynamicTemplateSession,
  TemplateExportRecord,
  TemplateFieldSchema,
  TemplateFormData,
  WorkspaceMemberOption,
} from "@/lib/template-renderer/types";
import { createClient } from "@/utils/supabase/server";

import {
  fetchSelectedInstance,
  fetchTemplateAccess,
  fetchTemplateExports,
  fetchTemplateInstances,
  fetchTemplateResource,
  fetchWorkspaceDirectory,
  type DirectoryMemberRow,
  type ExistingTemplateInstance,
  type OrganizationContext,
  type ResourceWithDefinition,
  type TemplateDefinitionRow,
  type TemplateInstanceSummary,
} from "./dynamic-template-editor-queries";
import { requireMemberContext } from "./member-context";

type MemberContext = Awaited<ReturnType<typeof requireMemberContext>>["member"];

type ResolvedTemplateDefinition = {
  definition: TemplateDefinitionRow;
  schema: TemplateFieldSchema;
};

function fallbackValue<T>(value: T | null | undefined, fallback: T) {
  return value ?? fallback;
}

function fallbackString(value: string | null | undefined, fallback: string) {
  return value ?? fallback;
}

function firstTemplateDefinition(
  definitions: ResourceWithDefinition["template_definitions"],
) {
  return Array.isArray(definitions) ? definitions[0] : definitions;
}

function resolveTemplateDefinition(
  resource: ResourceWithDefinition,
): ResolvedTemplateDefinition | null {
  const definition = firstTemplateDefinition(resource.template_definitions);
  const schema = normalizeTemplateSchema(definition?.field_schema);

  if (!definition || !schema) {
    return null;
  }

  return { definition, schema };
}

function hasOrganizationTemplateAccess(
  planAccess: Array<{ plan_id: string }> | null,
  directAccess: { resource_id: string } | null,
  organization: OrganizationContext,
) {
  const hasPlanAccess = (planAccess ?? []).some(
    (access) => access.plan_id === organization.tier,
  );

  return Boolean(directAccess || hasPlanAccess);
}

function resolveSelectedSessionId(
  requestedSessionId: string | undefined,
  instances: TemplateInstanceSummary[] | null,
) {
  if (requestedSessionId === "new") {
    return null;
  }

  return requestedSessionId ?? instances?.[0]?.id ?? null;
}

function buildFormData(
  definition: TemplateDefinitionRow,
  existing: ExistingTemplateInstance | null,
  member: MemberContext,
) {
  const defaultValues = (definition.default_values ?? {}) as TemplateFormData;

  return {
    ...defaultValues,
    administrator: defaultValues.administrator || member.name,
    contact_email: defaultValues.contact_email || member.email,
    ...((existing?.form_data ?? {}) as TemplateFormData),
  };
}

function mapWorkspaceMembers(directory: DirectoryMemberRow[] | null): WorkspaceMemberOption[] {
  return (directory ?? [])
    .filter((directoryMember) => directoryMember.status === "active")
    .map((directoryMember) => ({
      id: directoryMember.user_id,
      email: directoryMember.email,
      name: directoryMember.full_name,
    }));
}

function buildDynamicSession({
  resource,
  definition,
  schema,
  schemaSnapshot,
  existing,
  organization,
  formData,
}: {
  resource: ResourceWithDefinition;
  definition: TemplateDefinitionRow;
  schema: TemplateFieldSchema;
  schemaSnapshot: TemplateFieldSchema;
  existing: ExistingTemplateInstance | null;
  organization: OrganizationContext;
  formData: TemplateFormData;
}): DynamicTemplateSession {
  const currentTimestamp = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const draftTitle = `${resource.title} ${currentYear}`;
  const draftInstance: ExistingTemplateInstance = {
    id: "",
    title: draftTitle,
    status: "draft",
    form_data: {},
    branding_snapshot: organization.brand,
    definition_version: null,
    schema_snapshot: schemaSnapshot,
    completion_percent: 0,
    last_saved_at: currentTimestamp,
    updated_at: currentTimestamp,
  };
  const instance = fallbackValue(existing, draftInstance);
  const schemaVersion =
    instance.definition_version !== null && instance.definition_version !== undefined
      ? Number(instance.definition_version)
      : (definition.schema_version ?? schema.version);

  return {
    id: instance.id,
    resourceId: resource.id,
    organizationId: organization.id,
    title: fallbackString(instance.title, draftTitle),
    slug: resource.slug,
    schemaVersion,
    schemaSnapshot,
    brandingSnapshot:
      (instance.branding_snapshot as DynamicTemplateSession["brandingSnapshot"]) ??
      organization.brand,
    formData,
    completionPercent: fallbackValue(instance.completion_percent, 0),
    status: fallbackValue(instance.status as DynamicTemplateSession["status"], "draft"),
    lastSavedAt: fallbackValue(instance.last_saved_at, instance.updated_at),
  };
}

function mapExports(
  exports: Array<{
    id: string;
    format: TemplateExportRecord["format"];
    file_name: string;
    generated_at: string;
    created_by: string | null;
  }> | null,
) {
  return (exports ?? []).map((item) => ({
    id: item.id,
    format: item.format,
    fileName: item.file_name,
    generatedAt: item.generated_at,
    generatedBy: item.created_by,
  }));
}

function mapSessions(instances: TemplateInstanceSummary[] | null) {
  return (instances ?? []).map((instance) => ({
    id: instance.id,
    title: instance.title,
    status: instance.status as DynamicTemplateSession["status"],
    updatedAt: instance.updated_at,
  }));
}

export async function getDynamicTemplateEditorData(
  slug: string,
  sessionId?: string,
): Promise<DynamicTemplateEditorData | null> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const resource = await fetchTemplateResource(supabase, slug);
  if (!resource) return null;

  const { planAccess, directAccess } = await fetchTemplateAccess({
    supabase,
    resourceId: resource.id,
    organization,
  });
  if (!hasOrganizationTemplateAccess(planAccess, directAccess, organization)) return null;

  const resolved = resolveTemplateDefinition(resource);
  if (!resolved) return null;

  const { definition, schema } = resolved;
  const instances = await fetchTemplateInstances(
    supabase,
    organization.id,
    resource.id,
  );
  const selectedSessionId = resolveSelectedSessionId(sessionId, instances);
  const existing = await fetchSelectedInstance({
    supabase,
    selectedSessionId,
    organizationId: organization.id,
    resourceId: resource.id,
  });

  const formData = buildFormData(definition, existing, member);
  const schemaSnapshot = normalizeTemplateSchema(existing?.schema_snapshot) ?? schema;
  const session = buildDynamicSession({
    resource,
    definition,
    schema,
    schemaSnapshot,
    existing,
    organization,
    formData,
  });
  const [directory, exports] = await Promise.all([
    fetchWorkspaceDirectory({ supabase, organizationId: organization.id, schemaSnapshot }),
    fetchTemplateExports(supabase, session.id, organization.id),
  ]);

  return {
    organization,
    template: {
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      summary: resource.summary ?? "",
      description: resource.description,
      estimatedMinutes: resource.estimated_minutes,
      rendererKey: definition.renderer_key,
      supportsPdf: definition.supports_pdf,
      supportsDocx: definition.supports_docx,
    },
    session,
    exports: mapExports(exports),
    sessions: mapSessions(instances),
    workspaceMembers: mapWorkspaceMembers(directory),
  };
}
