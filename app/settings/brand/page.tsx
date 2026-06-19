import { requireMemberContext } from "@/lib/data/member-context";

import { BrandSettingsForm } from "./brand-settings-form";

export default async function BrandSettingsPage() {
  const { member, organization } = await requireMemberContext();

  if (!["owner", "admin"].includes(member.membershipRole)) {
    return (
      <div className="rounded-[14px] border bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Brand profile</h1>
        <p className="mt-3 max-w-2xl text-slate-500">
          Only organization owners and administrators can modify brand settings.
          Ask an administrator to update your logo, colors, or display name.
        </p>
      </div>
    );
  }

  return <BrandSettingsForm initialBrand={organization.brand} />;
}
