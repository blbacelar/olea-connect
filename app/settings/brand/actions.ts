"use server";

import { requireMemberContext } from "@/lib/data/member-context";
import type { BrandProfile } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export async function saveBrandProfile(
  brand: BrandProfile,
): Promise<BrandProfile> {
  const { organization } = await requireMemberContext();
  const supabase = await createClient();
  const displayName = brand.organizationName.trim();

  const { error: organizationError } = await supabase
    .from("organizations")
    .update({
      name: displayName,
      profile_completed_at: new Date().toISOString(),
    })
    .eq("id", organization.id);
  if (organizationError) throw organizationError;

  const { data, error } = await supabase
    .from("organization_brand_profiles")
    .upsert({
      organization_id: organization.id,
      display_name: displayName,
      logo_path: brand.logoUrl || null,
      primary_color: brand.primaryColor,
      secondary_color: brand.secondaryColor,
      brand_completed_at: new Date().toISOString(),
    })
    .select("display_name, logo_path, primary_color, secondary_color")
    .single();

  if (error) throw error;
  return {
    organizationName: data.display_name,
    logoInitials: brand.logoInitials,
    logoUrl: data.logo_path ?? undefined,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
  };
}
