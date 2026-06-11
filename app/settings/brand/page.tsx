import { getOrg } from "@/lib/db";

import { BrandSettingsForm } from "./brand-settings-form";

export default async function BrandSettingsPage() {
  const organization = await getOrg();
  return <BrandSettingsForm initialBrand={organization.brand} />;
}
