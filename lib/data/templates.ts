import "server-only";

import { normalizeTemplateSchema } from "@/lib/template-renderer/schema";
import type {
  DynamicTemplateEditorData,
  DynamicTemplateSession,
  TemplateExportRecord,
  TemplateFieldSchema,
  TemplateFormData,
} from "@/lib/template-renderer/types";
import type { MembershipTier, Template, TemplateSession } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

const planRank: Record<MembershipTier, number> = {
  seedling: 0,
  roots: 1,
  canopy: 2,
  harvest: 3,
};

export async function getTemplates(): Promise<Template[]> {
  const { organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { data: resources, error: resourcesError },
    { data: planAccess, error: planAccessError },
    { data: directAccess, error: directAccessError },
    { data: instances, error: instancesError },
  ] = await Promise.all([
    supabase
      .from("resources")
      .select(
        "id, slug, title, summary, estimated_minutes, published_at, resource_categories(name)",
      )
      .eq("type", "template")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase.from("resource_plan_access").select("resource_id, plan_id"),
    supabase
      .from("organization_resource_access")
      .select("resource_id")
      .eq("organization_id", organization.id)
      .lte("starts_at", new Date().toISOString()),
    supabase
      .from("template_instances")
      .select("resource_id, status, updated_at")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (resourcesError) throw resourcesError;
  if (planAccessError) throw planAccessError;
  if (directAccessError) throw directAccessError;
  if (instancesError) throw instancesError;

  const directIds = new Set((directAccess ?? []).map((row) => row.resource_id));
  const accessByResource = new Map<string, MembershipTier[]>();
  for (const row of planAccess ?? []) {
    const plans = accessByResource.get(row.resource_id) ?? [];
    plans.push(row.plan_id as MembershipTier);
    accessByResource.set(row.resource_id, plans);
  }
  const latestInstance = new Map<
    string,
    { status: string; updated_at: string }
  >();
  for (const instance of instances ?? []) {
    if (!latestInstance.has(instance.resource_id)) {
      latestInstance.set(instance.resource_id, instance);
    }
  }

  return (resources ?? []).map((resource) => {
    const allowedPlans = accessByResource.get(resource.id) ?? [];
    const requiredTier =
      allowedPlans.toSorted((left, right) => planRank[left] - planRank[right])[0] ??
      "harvest";
    const available =
      directIds.has(resource.id) || allowedPlans.includes(organization.tier);
    const instance = latestInstance.get(resource.id);
    const category = Array.isArray(resource.resource_categories)
      ? resource.resource_categories[0]
      : resource.resource_categories;

    return {
      id: resource.id,
      slug: resource.slug,
      name: resource.title,
      description: resource.summary,
      category: category?.name ?? "General",
      requiredTier,
      available,
      estimatedTime: resource.estimated_minutes
        ? `~${resource.estimated_minutes} min`
        : "Self-paced",
      status: instance
        ? `${instance.status === "completed" ? "Completed" : "Last updated"} ${new Intl.DateTimeFormat("en-CA", { month: "short", year: "numeric" }).format(new Date(instance.updated_at))}`
        : "Not started yet",
      isNew:
        Boolean(resource.published_at) &&
        Date.now() - new Date(resource.published_at!).getTime() <
          45 * 24 * 60 * 60 * 1000,
    };
  });
}

export async function getTemplateBySlug(slug: string) {
  const templates = await getTemplates();
  return templates.find((template) => template.slug === slug) ?? null;
}

export async function getTemplateSelectionOptions(): Promise<Template[]> {
  const { organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { data: resources, error: resourcesError },
    { data: selectedResources, error: selectedError },
  ] = await Promise.all([
    supabase
      .from("resources")
      .select(
        "id, slug, title, summary, estimated_minutes, published_at, resource_categories(name)",
      )
      .eq("type", "template")
      .eq("status", "published")
      .order("title"),
    supabase
      .from("organization_resource_access")
      .select("resource_id, starts_at, locked_until")
      .eq("organization_id", organization.id)
      .eq("access_kind", "selection"),
  ]);
  if (resourcesError) throw resourcesError;
  if (selectedError) throw selectedError;

  const selectedByResource = new Map(
    (selectedResources ?? []).map((item) => [
      item.resource_id,
      {
        selectedAt: item.starts_at,
        lockedUntil: item.locked_until,
      },
    ]),
  );
  return (resources ?? []).map((resource) => {
    const category = Array.isArray(resource.resource_categories)
      ? resource.resource_categories[0]
      : resource.resource_categories;
    const selected = selectedByResource.get(resource.id);
    return {
      id: resource.id,
      slug: resource.slug,
      name: resource.title,
      description: resource.summary,
      category: category?.name ?? "General",
      requiredTier: "seedling",
      available: Boolean(selected),
      estimatedTime: resource.estimated_minutes
        ? `~${resource.estimated_minutes} min`
        : "Self-paced",
      status: selected ? "Selected" : "Available to choose",
      availableAt: resource.published_at,
      selectedAt: selected?.selectedAt ?? null,
      lockedUntil: selected?.lockedUntil ?? null,
    };
  });
}

export async function getTemplateSession(): Promise<TemplateSession> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .select("id")
    .eq("slug", "board-self-evaluation")
    .eq("type", "template")
    .maybeSingle();

  if (resourceError) throw resourceError;
  if (!resource) {
    throw new Error("The Board Self-Evaluation template is not published.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("template_instances")
    .select("id, form_data, updated_at")
    .eq("organization_id", organization.id)
    .eq("resource_id", resource.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  const formData = (existing?.form_data ?? {}) as Partial<TemplateSession>;
  return {
    id: existing?.id ?? "",
    templateId: resource.id,
    organizationId: organization.id,
    boardYear: formData.boardYear ?? new Date().getFullYear().toString(),
    surveyPeriod: formData.surveyPeriod ?? "",
    answers: formData.answers ?? {},
    openEndedAnswers: formData.openEndedAnswers ?? {},
    administrator: formData.administrator ?? member.name,
    contact: formData.contact ?? member.email,
    deadline: formData.deadline ?? "",
    updatedAt: existing?.updated_at ?? new Date().toISOString(),
  };
}

export async function getDynamicTemplateEditorData(
  slug: string,
): Promise<DynamicTemplateEditorData | null> {
  const { member, organization } = await requireMemberContext();
  const templateSummary = await getTemplateBySlug(slug);

  if (!templateSummary?.available) return null;

  const supabase = await createClient();
  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .select(
      "id, slug, title, summary, description, estimated_minutes, template_definitions(renderer_key, schema_version, field_schema, default_values, supports_pdf, supports_docx)",
    )
    .eq("slug", slug)
    .eq("type", "template")
    .eq("status", "published")
    .maybeSingle();

  if (resourceError) throw resourceError;
  if (!resource) return null;

  const definition = Array.isArray(resource.template_definitions)
    ? resource.template_definitions[0]
    : resource.template_definitions;
  const schema = normalizeTemplateSchema(definition?.field_schema);

  if (!definition || !schema) return null;

  const { data: existing, error: existingError } = await supabase
    .from("template_instances")
    .select(
      "id, title, status, form_data, branding_snapshot, definition_version, schema_snapshot, completion_percent, last_saved_at, updated_at",
    )
    .eq("organization_id", organization.id)
    .eq("resource_id", resource.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const defaultValues = (definition.default_values ?? {}) as TemplateFormData;
  const formData = {
    ...defaultValues,
    administrator: defaultValues.administrator || member.name,
    contact_email: defaultValues.contact_email || member.email,
    ...((existing?.form_data ?? {}) as TemplateFormData),
  };
  const schemaSnapshot =
    normalizeTemplateSchema(existing?.schema_snapshot) ?? schema;
  const session: DynamicTemplateSession = {
    id: existing?.id ?? "",
    resourceId: resource.id,
    organizationId: organization.id,
    title: existing?.title ?? `${resource.title} ${new Date().getFullYear()}`,
    slug: resource.slug,
    schemaVersion:
      existing?.definition_version ?? definition.schema_version ?? schema.version,
    schemaSnapshot: schemaSnapshot as TemplateFieldSchema,
    brandingSnapshot:
      (existing?.branding_snapshot as DynamicTemplateSession["brandingSnapshot"]) ??
      organization.brand,
    formData,
    completionPercent: existing?.completion_percent ?? 0,
    status: (existing?.status as DynamicTemplateSession["status"]) ?? "draft",
    lastSavedAt:
      existing?.last_saved_at ?? existing?.updated_at ?? new Date().toISOString(),
  };
  const { data: exports, error: exportsError } = session.id
    ? await supabase
        .from("template_exports")
        .select("id, format, file_name, generated_at, created_by")
        .eq("template_instance_id", session.id)
        .eq("organization_id", organization.id)
        .order("generated_at", { ascending: false })
        .limit(10)
    : { data: [], error: null };

  if (exportsError) throw exportsError;

  return {
    organization,
    template: {
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      summary: resource.summary,
      description: resource.description,
      estimatedMinutes: resource.estimated_minutes,
      rendererKey: definition.renderer_key,
      supportsPdf: definition.supports_pdf,
      supportsDocx: definition.supports_docx,
    },
    session,
    exports: ((exports ?? []) as Array<{
      id: string;
      format: TemplateExportRecord["format"];
      file_name: string;
      generated_at: string;
      created_by: string | null;
    }>).map((item) => ({
      id: item.id,
      format: item.format,
      fileName: item.file_name,
      generatedAt: item.generated_at,
      generatedBy: item.created_by,
    })),
  };
}
