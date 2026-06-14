"use server";

import { requireMemberContext } from "@/lib/data/member-context";
import { createClient } from "@/utils/supabase/server";

export async function saveTemplateSelections(resourceIds: string[]) {
  const { member, organization } = await requireMemberContext();
  if (!["owner", "admin"].includes(member.membershipRole)) {
    throw new Error("Only organization owners and admins can select templates.");
  }
  if (organization.tier !== "seedling") {
    throw new Error("Template selection only applies to Seedling memberships.");
  }
  if (new Set(resourceIds).size !== 3) {
    throw new Error("Choose exactly three templates.");
  }

  const supabase = await createClient();
  const { data: resources, error: resourcesError } = await supabase
    .from("resources")
    .select("id")
    .in("id", resourceIds)
    .eq("type", "template")
    .eq("status", "published");
  if (resourcesError) throw resourcesError;
  if (resources?.length !== 3) {
    throw new Error("One or more selected templates are unavailable.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("organization_resource_access")
    .select("resource_id")
    .eq("organization_id", organization.id)
    .eq("access_kind", "selection");
  if (existingError) throw existingError;

  const existingIds = new Set((existing ?? []).map((item) => item.resource_id));
  const missingIds = resourceIds.filter((id) => !existingIds.has(id));
  if (existingIds.size + missingIds.length > 3) {
    throw new Error("Your Seedling template selections are already complete.");
  }
  if (!missingIds.length) return;

  const { error } = await supabase.from("organization_resource_access").insert(
    missingIds.map((resourceId) => ({
      organization_id: organization.id,
      resource_id: resourceId,
      access_kind: "selection",
      granted_by: member.id,
    })),
  );
  if (error) throw error;
}
