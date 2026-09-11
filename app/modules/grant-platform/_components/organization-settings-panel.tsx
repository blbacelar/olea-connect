"use client";

import { HelpCircle, Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import { useFormState } from "react-dom";

import { saveGrantPlatformOrganizationSettings } from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

const fundingSourceOptions = [
  "Foundation Grants",
  "Individual Donors",
  "Government Funding",
  "Corporate Sponsorships",
  "Earned Revenue",
  "Fundraising Events",
];

function formatCurrencyInputValue(cents: number | null) {
  if (cents === null) return "$0";

  return String(cents / 100);
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
  const [boardChairUserId, setBoardChairUserId] = useState(
    data.organizationSettings.boardChairUserId ?? "manual",
  );
  const disabled = !canEditOrgProfile;

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
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
                aria-label="Permission levels info"
              >
                <HelpCircle className="size-4" />
              </Button>
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
          <div className="rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {data.teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium text-slate-900">{member.displayName}</TableCell>
                    <TableCell className="text-slate-600">{member.email}</TableCell>
                    <TableCell>
                      <Badge className="bg-orange-500 text-white">{member.role.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-olea-green">Active</span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" disabled={!canManageTeam}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button disabled={!canManageTeam} className="w-fit">
            <Plus className="mr-2 size-4" />
            Invite Team Member
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Organization Details</h3>
          <form action={settingsFormAction} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="grant-org-name">Organization Name</Label>
              <Input id="grant-org-name" defaultValue={data.organizationName} disabled />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grant-org-type">Organization Type</Label>
                <input type="hidden" name="organizationType" value={orgType} />
                <Select disabled={disabled} value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger id="grant-org-type" className="w-full">
                  <SelectValue placeholder="Select Organization Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grassroots (under $250K/yr)">Grassroots (under $250K/yr)</SelectItem>
                    <SelectItem value="Growing ($250K-$1M)">Growing ($250K-$1M)</SelectItem>
                    <SelectItem value="Established ($1M+)">Established ($1M+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grant-annual-revenue">Current Annual Revenue</Label>
                <CurrencyInput
                  id="grant-annual-revenue"
                  defaultValue={
                    data.organizationSettings.currentAnnualRevenueCents
                      ? formatCurrencyInputValue(data.organizationSettings.currentAnnualRevenueCents)
                      : ""
                  }
                  disabled={disabled}
                  name="currentAnnualRevenue"
                  placeholder="$450,000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grant-society-number">Society number</Label>
                <Input
                  id="grant-society-number"
                  name="societyNumber"
                  defaultValue={data.organizationSettings.societyNumber}
                  disabled={disabled}
                  placeholder="S-12345"
                  pattern="[A-Za-z0-9][A-Za-z0-9 -]{1,79}"
                  title="Use letters, numbers, spaces, or hyphens."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-charity-number">Charity registration number</Label>
                <Input
                  id="grant-charity-number"
                  name="charityRegistrationNumber"
                  defaultValue={data.organizationSettings.charityRegistrationNumber}
                  disabled={disabled}
                  placeholder="123456789RR0001"
                  pattern="[0-9]{9}[A-Za-z]{2}[0-9]{4}"
                  title="Use the CRA format, for example 123456789RR0001."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grant-board-chair">Board chair platform user</Label>
                <input
                  type="hidden"
                  name="boardChairUserId"
                  value={boardChairUserId === "manual" ? "" : boardChairUserId}
                />
                <Select
                  disabled={disabled}
                  value={boardChairUserId}
                  onValueChange={setBoardChairUserId}
                >
                  <SelectTrigger id="grant-board-chair" className="w-full">
                    <SelectValue placeholder="Select a workspace member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Not assigned</SelectItem>
                    {data.teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Choose from active workspace members only.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-board-chair-name">Board chair name</Label>
                <Input
                  id="grant-board-chair-name"
                  name="boardChairName"
                  defaultValue={data.organizationSettings.boardChairName}
                  disabled={disabled}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-board-chair-email">Board chair email</Label>
                <Input
                  id="grant-board-chair-email"
                  name="boardChairEmail"
                  defaultValue={data.organizationSettings.boardChairEmail}
                  disabled={disabled}
                  placeholder="jane@organization.org"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-board-chair-phone">Board chair phone</Label>
                <Input
                  id="grant-board-chair-phone"
                  name="boardChairPhone"
                  defaultValue={data.organizationSettings.boardChairPhone}
                  disabled={disabled}
                  placeholder="(604) 555-0123"
                  type="tel"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Funding Sources (Select All That Apply)</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {fundingSourceOptions.map((source) => (
                  <label key={source} className="flex items-center gap-2 text-sm font-normal text-slate-700">
                    <Checkbox
                      defaultChecked={data.organizationSettings.fundingSources.includes(source)}
                      disabled={disabled}
                      name="fundingSources"
                      value={source}
                    />
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
