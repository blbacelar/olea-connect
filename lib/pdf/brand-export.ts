import type { BrandProfile } from "@/lib/types";

export type PdfBrand = Pick<
  BrandProfile,
  | "organizationName"
  | "logoInitials"
  | "logoUrl"
  | "primaryColor"
  | "secondaryColor"
  | "address"
  | "phone"
  | "contactEmail"
  | "website"
>;

export function normalizePdfBrand(
  brand: Partial<PdfBrand> | undefined,
  fallbackPrimary = "#446B52",
  fallbackSecondary = "#F4EFE4",
): PdfBrand & {
  primaryColor: string;
  secondaryColor: string;
} {
  return {
    organizationName: brand?.organizationName || "Organization",
    logoInitials: brand?.logoInitials || "OC",
    logoUrl: brand?.logoUrl,
    primaryColor: safeColor(brand?.primaryColor, fallbackPrimary),
    secondaryColor: safeColor(brand?.secondaryColor, fallbackSecondary),
    address: brand?.address || "",
    phone: brand?.phone || "",
    contactEmail: brand?.contactEmail || "",
    website: brand?.website || "",
  };
}

export function buildPdfFooter(
  brand: Partial<PdfBrand> | undefined,
  reportTitle: string,
  preparedOn?: string,
) {
  const parts = [brand?.organizationName || "Organization", reportTitle].filter(Boolean);

  if (preparedOn) {
    parts.push(`Prepared ${preparedOn}`);
  }

  const contactDetails = [
    brand?.address ? `Address: ${brand.address}` : null,
    brand?.phone ? `Phone: ${brand.phone}` : null,
    brand?.contactEmail ? `Email: ${brand.contactEmail}` : null,
    brand?.website
      ? `Web: ${brand.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}`
      : null,
  ].filter(Boolean);

  return [...parts, ...contactDetails].join(" • ");
}

function safeColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback;
}
