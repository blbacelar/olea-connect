import "server-only";

import { accreditationResourceSlug } from "@/lib/accreditation/catalog";
import {
  buildWorkspaceData,
  normalizeResponses,
  normalizeSettings,
} from "@/lib/accreditation/domain";
import type { AccreditationWorkspaceData } from "@/lib/accreditation/types";
import { createClient } from "@/utils/supabase/server";

import { hasAccreditationWorkspaceAccess } from "./accreditation-access";
import { requireMemberContext } from "./member-context";

type MemberContext = Awaited<ReturnType<typeof requireMemberContext>>;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getAccreditationWorkspaceData(): Promise<AccreditationWorkspaceData> {
  const memberContext = await requireMemberContext();
  const supabase = await createClient();
  const resource = await requireAccreditationResource(supabase);

  await requireAccreditationAccess({
    memberContext,
    resourceId: resource.id,
    supabase,
  });

  const existing = await getLatestAccreditationInstance({
    organizationId: memberContext.organization.id,
    resourceId: resource.id,
    supabase,
  });
  const formModel = buildAccreditationFormModel(
    existing?.form_data,
    memberContext.organization.brand.organizationName,
  );

  if (existing) {
    return buildWorkspaceData({
      configured: formModel.configured,
      instanceId: existing.id,
      lastUpdatedAt: existing.updated_at,
      resourceId: resource.id,
      responses: formModel.responses,
      settings: formModel.settings,
    });
  }

  return createAccreditationInstance({
    formModel,
    memberContext,
    resourceId: resource.id,
    supabase,
  });
}

async function requireAccreditationResource(supabase: SupabaseClient) {
  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .select("id")
    .eq("slug", accreditationResourceSlug)
    .eq("type", "template")
    .eq("status", "published")
    .maybeSingle();

  if (resourceError) throw resourceError;
  if (!resource) {
    throw new Error("The accreditation preparation module is not published.");
  }

  return resource;
}

async function requireAccreditationAccess({
  memberContext,
  resourceId,
  supabase,
}: {
  memberContext: MemberContext;
  resourceId: string;
  supabase: SupabaseClient;
}) {
  const { organization } = memberContext;
  const [
    { data: planAccess, error: planAccessError },
    { data: directAccess, error: directAccessError },
  ] = await Promise.all([
    supabase
      .from("resource_plan_access")
      .select("plan_id")
      .eq("resource_id", resourceId),
    supabase
      .from("organization_resource_access")
      .select("resource_id, ends_at")
      .eq("organization_id", organization.id)
      .eq("resource_id", resourceId)
      .lte("starts_at", new Date().toISOString()),
  ]);

  if (planAccessError) throw planAccessError;
  if (directAccessError) throw directAccessError;

  const hasAccess = hasAccreditationWorkspaceAccess({
    directAccess: directAccess ?? [],
    organizationTier: organization.tier,
    planAccess: planAccess ?? [],
  });

  if (!hasAccess) {
    throw new Error("Your plan does not include this accreditation workspace.");
  }
}

async function getLatestAccreditationInstance({
  organizationId,
  resourceId,
  supabase,
}: {
  organizationId: string;
  resourceId: string;
  supabase: SupabaseClient;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("template_instances")
    .select("id, form_data, updated_at")
    .eq("organization_id", organizationId)
    .eq("resource_id", resourceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  return existing;
}

function buildAccreditationFormModel(
  persistedFormData: unknown,
  organizationName: string,
) {
  const formData = (persistedFormData ?? {}) as Record<string, unknown>;
  const settings = normalizeSettings(formData.settings, organizationName);
  const responses = normalizeResponses(formData.responses);
  const configured =
    typeof formData.configured === "boolean"
      ? formData.configured
      : Boolean(settings.organizationName.trim());

  return { configured, responses, settings };
}

async function createAccreditationInstance({
  formModel,
  memberContext,
  resourceId,
  supabase,
}: {
  formModel: ReturnType<typeof buildAccreditationFormModel>;
  memberContext: MemberContext;
  resourceId: string;
  supabase: SupabaseClient;
}): Promise<AccreditationWorkspaceData> {
  const { member, organization } = memberContext;
  const { data: created, error: createError } = await supabase
    .from("template_instances")
    .insert({
      branding_snapshot: organization.brand,
      created_by: member.id,
      form_data: {
        configured: false,
        responses: formModel.responses,
        settings: formModel.settings,
      },
      organization_id: organization.id,
      resource_id: resourceId,
      status: "draft",
      title: "Accreditation Preparation Workspace",
    })
    .select("id, form_data, updated_at")
    .single();

  if (createError) throw createError;

  return buildWorkspaceData({
    configured: false,
    instanceId: created.id,
    lastUpdatedAt: created.updated_at,
    resourceId,
    responses: formModel.responses,
    settings: formModel.settings,
  });
}
