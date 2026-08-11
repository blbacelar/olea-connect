"use client";

import { HelpCircle, Settings2 } from "lucide-react";
import { useState } from "react";
import { useFormState } from "react-dom";

import { saveGrantPlatformOrganizationSettings } from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

function formatCurrencyDisplay(cents: number | null) {
  if (cents === null) return "$0";

  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

export function OrganizationSettingsPanel({
  canEditOrgProfile,
  canManageTeam,
  data,
}: {
  canEditOrgProfile: boolean;
  canManageTeam: boolean;
  data: GrantPlatformWorkspaceData;
}) {
  const [settingsState, settingsFormAction] = useFormState(saveGrantPlatformOrganizationSettings, {
    message: "",
    success: false,
  });
  const [orgType, setOrgType] = useState(data.organizationSettings.organizationType);
  const disabled = !canEditOrgProfile;
  const fundingSourceOptions = ["Foundation Grants", "Individual Donors", "Government Funding", "Corporate Sponsorships", "Earned Revenue", "Fundraising Events"];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="size-5 text-olea-green" />
          Organization Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div id="teamManagementSection" className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Team Members & Permissions</h3>
              <p className="mt-1 text-sm text-slate-600">Manage who has access to the platform and what they can do.</p>
            </div>
            <div className="group relative">
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
                aria-label="Permission levels info"
              >
                <HelpCircle className="size-4" />
              </button>
              <div className="pointer-events-none absolute right-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                <p className="mb-2 font-bold text-slate-900 text-xs">Permission Levels Guidelines</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p><strong>Admin:</strong> Full access - manage everything, team members, settings.</p>
                  <p><strong>Grant Manager:</strong> Edit grants, view all, add team notes, no budget edits.</p>
                  <p><strong>Finance:</strong> View all grants, edit budgets, review reports, no grant edits.</p>
                  <p><strong>Partner:</strong> View/edit only their own grants, add notes.</p>
                  <p><strong>Viewer:</strong> Read-only access to reports and pipeline.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{member.displayName}</td>
                    <td className="px-4 py-3 text-slate-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-orange-500 text-white">{member.role.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-olea-green">Active</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" disabled={!canManageTeam}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button disabled={!canManageTeam} className="w-fit">
            + Invite Team Member
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Organization Details</h3>
          <form action={settingsFormAction} className="space-y-4 max-w-2xl">
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700">Organization Name</label>
              <input className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100" defaultValue={data.organizationName} disabled />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-group">
                <label className="block text-sm font-medium text-slate-700">Organization Type</label>
                <input type="hidden" name="organizationType" value={orgType} />
                <Select disabled={disabled} value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Select Organization Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grassroots (under $250K/yr)">Grassroots (under $250K/yr)</SelectItem>
                    <SelectItem value="Growing ($250K-$1M)">Growing ($250K-$1M)</SelectItem>
                    <SelectItem value="Established ($1M+)">Established ($1M+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-slate-700">Current Annual Revenue</label>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                  defaultValue={data.organizationSettings.currentAnnualRevenueCents ? formatCurrencyDisplay(data.organizationSettings.currentAnnualRevenueCents) : ""}
                  disabled={disabled}
                  name="currentAnnualRevenue"
                  placeholder="$450,000"
                  type="text"
                />
              </div>
            </div>

            <div className="form-group space-y-3">
              <label className="block text-sm font-medium text-slate-700">Funding Sources (Select All That Apply)</label>
              <div className="grid gap-3 md:grid-cols-2">
                {fundingSourceOptions.map((source) => (
                  <label key={source} className="flex items-center gap-2 text-sm font-normal text-slate-700">
                    <input defaultChecked={data.organizationSettings.fundingSources.includes(source)} disabled={disabled} name="fundingSources" type="checkbox" value={source} />
                    {source}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900">
              Only Admins can edit organization settings.
            </div>

            <div>
              <Button disabled={disabled} type="submit">
                Save organization settings
              </Button>
            </div>
            {settingsState.message ? (
              <p className={`text-sm ${settingsState.success ? "text-olea-green" : "text-red-600"}`}>{settingsState.message}</p>
            ) : null}
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
