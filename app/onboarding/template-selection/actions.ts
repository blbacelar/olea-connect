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
  const requestedIds = [...new Set(resourceIds)];

  const supabase = await createClient();
  const { data: resources, error: resourcesError } = await supabase
    .from("resources")
    .select("id")
    .in("id", requestedIds)
    .eq("type", "template")
    .eq("status", "published");
  if (resourcesError) throw resourcesError;
  if (resources?.length !== 3) {
    throw new Error("One or more selected templates are unavailable.");
  }

  const { error } = await supabase.rpc("replace_seedling_template_selections", {
    selected_resource_ids: requestedIds,
    target_organization_id: organization.id,
  });
  if (error) throw error;
}
