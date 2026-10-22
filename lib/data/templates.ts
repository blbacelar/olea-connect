import "server-only";

import { buildGrantPlatformTemplate } from "@/lib/templates/grant-platform";
import type { MembershipTier, Template, TemplateSession } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

export { getDynamicTemplateEditorData } from "./dynamic-template-editor";

const planRank: Record<MembershipTier, number> = {
  seedling: 0,
  roots: 1,
  canopy: 2,
  harvest: 3,
};

type TemplateResourceRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  estimated_minutes: number | null;
  published_at: string | null;
  resource_categories: { name: string } | Array<{ name: string }> | null;
};

type TemplateInstanceRow = {
  resource_id: string;
  status: string;
  updated_at: string;
};

type TemplateAccessRow = {
  resource_id: string;
  plan_id: MembershipTier;
};

function fallbackValue<T>(value: T | null | undefined, fallback: T) {
  return value ?? fallback;
}

function firstCategory(
  categories: TemplateResourceRow["resource_categories"],
) {
  return Array.isArray(categories) ? categories[0] : categories;
}

function estimatedTemplateTime(minutes: number | null) {
  return minutes ? `~${minutes} min` : "Self-paced";
}

function buildAccessByResource(planAccess: TemplateAccessRow[] | null) {
  const accessByResource = new Map<string, MembershipTier[]>();

  for (const row of planAccess ?? []) {
    const plans = accessByResource.get(row.resource_id) ?? [];
    plans.push(row.plan_id);
    accessByResource.set(row.resource_id, plans);
  }

  return accessByResource;
}

function buildLatestInstances(instances: TemplateInstanceRow[] | null) {
  const latestInstance = new Map<string, Omit<TemplateInstanceRow, "resource_id">>();

  for (const instance of instances ?? []) {
    if (!latestInstance.has(instance.resource_id)) {
      latestInstance.set(instance.resource_id, instance);
    }
  }

  return latestInstance;
}

function formatTemplateStatus(instance?: Omit<TemplateInstanceRow, "resource_id">) {
  if (!instance) {
    return "Not started yet";
  }

  const statusLabel = instance.status === "completed" ? "Completed" : "Last updated";
  const updatedAt = new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
  }).format(new Date(instance.updated_at));

  return `${statusLabel} ${updatedAt}`;
}

function mapTemplateResource({
  resource,
  accessByResource,
  directIds,
  organizationTier,
  latestInstance,
}: {
  resource: TemplateResourceRow;
  accessByResource: Map<string, MembershipTier[]>;
  directIds: Set<string>;
  organizationTier: MembershipTier;
  latestInstance: Map<string, Omit<TemplateInstanceRow, "resource_id">>;
}): Template {
  const allowedPlans = accessByResource.get(resource.id) ?? [];
  const requiredTier =
    allowedPlans.toSorted((left, right) => planRank[left] - planRank[right])[0] ??
    "harvest";
  const instance = latestInstance.get(resource.id);
  const category = firstCategory(resource.resource_categories);

  return {
    id: resource.id,
    slug: resource.slug,
    name: resource.title,
    description: resource.summary,
    category: category?.name ?? "General",
    requiredTier,
    available: directIds.has(resource.id) || allowedPlans.includes(organizationTier),
    estimatedTime: estimatedTemplateTime(resource.estimated_minutes),
    status: formatTemplateStatus(instance),
    isNew:
      Boolean(resource.published_at) &&
      Date.now() - new Date(resource.published_at!).getTime() <
        45 * 24 * 60 * 60 * 1000,
  };
}

function appendGrantPlatformTemplate(templates: Template[]) {
  const grantPlatformTemplate = buildGrantPlatformTemplate();
  const hasGrantPlatformTemplate = templates.some(
    (template) => template.slug === grantPlatformTemplate.slug,
  );

  if (hasGrantPlatformTemplate) {
    return templates;
  }

  return [
    ...templates,
    {
      id: grantPlatformTemplate.slug,
      slug: grantPlatformTemplate.slug,
      name: grantPlatformTemplate.name,
      description: grantPlatformTemplate.summary,
      category: grantPlatformTemplate.category,
      requiredTier: "seedling" as MembershipTier,
      available: true,
      estimatedTime: "~20 min",
      status: "Ready to review",
      isNew: true,
    },
  ];
}

function buildTemplateSession({
  resourceId,
  organizationId,
  memberName,
  memberEmail,
  existing,
}: {
  resourceId: string;
  organizationId: string;
  memberName: string;
  memberEmail: string;
  existing: { id: string; form_data: unknown; updated_at: string } | null;
}): TemplateSession {
  const currentYear = new Date().getFullYear().toString();
  const existingInstance = fallbackValue(existing, {
    id: "",
    form_data: {},
    updated_at: new Date().toISOString(),
  });
  const formData = existingInstance.form_data as Partial<TemplateSession>;

  return {
    id: existingInstance.id,
    templateId: resourceId,
    organizationId,
    boardYear: fallbackValue(formData.boardYear, currentYear),
    surveyPeriod: fallbackValue(formData.surveyPeriod, ""),
    answers: fallbackValue(formData.answers, {}),
    openEndedAnswers: fallbackValue(formData.openEndedAnswers, {}),
    administrator: fallbackValue(formData.administrator, memberName),
    contact: fallbackValue(formData.contact, memberEmail),
    deadline: fallbackValue(formData.deadline, ""),
    updatedAt: existingInstance.updated_at,
  };
}

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
  const accessByResource = buildAccessByResource(
    planAccess as TemplateAccessRow[] | null,
  );
  const latestInstance = buildLatestInstances(
    instances as TemplateInstanceRow[] | null,
  );
  const mappedTemplates = ((resources ?? []) as TemplateResourceRow[]).map((resource) =>
    mapTemplateResource({
      resource,
      accessByResource,
      directIds,
      organizationTier: organization.tier,
      latestInstance,
    }),
  );

  return appendGrantPlatformTemplate(mappedTemplates);
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
  return buildTemplateSession({
    resourceId: resource.id,
    organizationId: organization.id,
    memberName: member.name,
    memberEmail: member.email,
    existing,
  });
}
