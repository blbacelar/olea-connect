import { requireMemberContext } from "@/lib/data/member-context";

import { BrandSettingsForm } from "./brand-settings-form";

export default async function BrandSettingsPage() {
  const { organization } = await requireMemberContext();
  return <BrandSettingsForm initialBrand={organization.brand} />;
}
