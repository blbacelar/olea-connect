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

export async function getAccreditationWorkspaceData(): Promise<AccreditationWorkspaceData> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();

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

  const [
    { data: planAccess, error: planAccessError },
    { data: directAccess, error: directAccessError },
  ] = await Promise.all([
    supabase
      .from("resource_plan_access")
      .select("plan_id")
      .eq("resource_id", resource.id),
    supabase
      .from("organization_resource_access")
      .select("resource_id, ends_at")
      .eq("organization_id", organization.id)
      .eq("resource_id", resource.id)
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

  const { data: existing, error: existingError } = await supabase
    .from("template_instances")
    .select("id, form_data, updated_at")
    .eq("organization_id", organization.id)
    .eq("resource_id", resource.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const formData = (existing?.form_data ?? {}) as Record<string, unknown>;
  const settings = normalizeSettings(formData.settings, organization.brand.organizationName);
  const responses = normalizeResponses(formData.responses);
  const configured =
    typeof formData.configured === "boolean"
      ? formData.configured
      : Boolean(settings.organizationName.trim());

  if (existing) {
    return buildWorkspaceData({
      configured,
      instanceId: existing.id,
      lastUpdatedAt: existing.updated_at,
      resourceId: resource.id,
      responses,
      settings,
    });
  }

  const { data: created, error: createError } = await supabase
    .from("template_instances")
    .insert({
      branding_snapshot: organization.brand,
      created_by: member.id,
      form_data: {
        configured: false,
        responses,
        settings,
      },
      organization_id: organization.id,
      resource_id: resource.id,
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
    resourceId: resource.id,
    responses,
    settings,
  });
}
