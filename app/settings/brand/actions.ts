"use server";

import { randomUUID } from "node:crypto";

import { requireMemberContext } from "@/lib/data/member-context";
import {
  ORGANIZATION_LOGOS_BUCKET,
  createLogoSignedUrl,
} from "@/lib/data/brand-assets";
import type { BrandProfile } from "@/lib/types";
import {
  normalizeOptionalEmail,
  normalizeOptionalHttpUrl,
  normalizeOptionalPhone,
} from "@/lib/input-validation";
import { createClient } from "@/utils/supabase/server";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/svg+xml", "svg"],
]);

export async function saveBrandProfile(
  brand: BrandProfile,
): Promise<BrandProfile> {
  const { member, organization } = await requireMemberContext();
  assertBrandAdmin(member.membershipRole);

  const supabase = await createClient();
  const displayName = brand.organizationName.trim();
  assertCompleteBrand(displayName, brand.primaryColor, brand.secondaryColor);
  const phone = normalizeOptionalPhone(brand.phone, "Footer phone");
  const contactEmail = normalizeOptionalEmail(brand.contactEmail, "Footer email");
  const website = normalizeOptionalHttpUrl(brand.website, "Footer website");

  const { data: existingBrand, error: existingBrandError } = await supabase
    .from("organization_brand_profiles")
    .select("logo_path")
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (existingBrandError) throw existingBrandError;

  const nextLogoPath = brand.logoPath || null;

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
      logo_path: nextLogoPath,
      primary_color: brand.primaryColor,
      secondary_color: brand.secondaryColor,
      address: nullableText(brand.address),
      phone,
      contact_email: contactEmail,
      website,
      brand_completed_at: new Date().toISOString(),
    })
    .select(
      "display_name, logo_path, primary_color, secondary_color, address, phone, contact_email, website",
    )
    .single();

  if (error) throw error;

  const previousLogoPath = existingBrand?.logo_path;
  if (previousLogoPath && previousLogoPath !== data.logo_path) {
    await supabase.storage
      .from(ORGANIZATION_LOGOS_BUCKET)
      .remove([previousLogoPath]);
  }

  return {
    organizationName: data.display_name,
    logoInitials: getInitials(data.display_name),
    logoPath: data.logo_path ?? undefined,
    logoUrl: await createLogoSignedUrl(supabase, data.logo_path),
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    address: data.address ?? undefined,
    phone: data.phone ?? undefined,
    contactEmail: data.contact_email ?? undefined,
    website: data.website ?? undefined,
  };
}

export async function uploadBrandLogo(formData: FormData) {
  const { member, organization } = await requireMemberContext();
  assertBrandAdmin(member.membershipRole);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Choose a logo file to upload.");
  }

  const extension = ACCEPTED_LOGO_TYPES.get(file.type);
  if (!extension) {
    throw new Error("Choose a PNG, JPG, or SVG file.");
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("Logo must be smaller than 2 MB.");
  }

  const supabase = await createClient();
  const path = `${organization.id}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(ORGANIZATION_LOGOS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return {
    path,
    signedUrl: await createLogoSignedUrl(supabase, path),
  };
}

function assertBrandAdmin(role: string) {
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Only organization owners and admins can modify brand settings.");
  }
}

function assertCompleteBrand(
  displayName: string,
  primaryColor: string,
  secondaryColor: string,
) {
  if (!displayName) throw new Error("Organization name is required.");
  if (!isHexColor(primaryColor) || !isHexColor(secondaryColor)) {
    throw new Error("Brand colors must use valid hex values.");
  }
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function getInitials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OC"
  );
}

function nullableText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
