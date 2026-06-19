import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BrandProfile } from "@/lib/types";

export const ORGANIZATION_LOGOS_BUCKET = "organization-logos";

const SIGNED_LOGO_URL_TTL_SECONDS = 60 * 60;

export async function createLogoSignedUrl(
  supabase: SupabaseClient,
  logoPath?: string | null,
) {
  if (!logoPath) return undefined;

  const { data, error } = await supabase.storage
    .from(ORGANIZATION_LOGOS_BUCKET)
    .createSignedUrl(logoPath, SIGNED_LOGO_URL_TTL_SECONDS);

  if (error) return undefined;
  return data.signedUrl;
}

export async function createBrandingSnapshot(
  supabase: SupabaseClient,
  brand: BrandProfile,
): Promise<BrandProfile> {
  if (!brand.logoPath) return { ...brand, logoUrl: undefined };

  const { data, error } = await supabase.storage
    .from(ORGANIZATION_LOGOS_BUCKET)
    .download(brand.logoPath);

  if (error || !data) return { ...brand, logoUrl: undefined };

  const buffer = Buffer.from(await data.arrayBuffer());
  const mimeType = data.type || mimeTypeFromPath(brand.logoPath);

  return {
    ...brand,
    logoUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
  };
}

function mimeTypeFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "svg") return "image/svg+xml";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "image/png";
}
