"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleCheckBig,
  FileText,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  ReceiptText,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import { AddGrantDialog } from "@/app/modules/grant-platform/_components/add-grant-dialog";
import { GrantCalendarPanel } from "@/app/modules/grant-platform/_components/grant-calendar-panel";
import { GrantDashboardPanel } from "@/app/modules/grant-platform/_components/grant-dashboard-panel";
import { GrantFinancePanel } from "@/app/modules/grant-platform/_components/grant-finance-panel";
import { GrantFunderReportsPanel } from "@/app/modules/grant-platform/_components/grant-funder-reports-panel";
import { GrantFundersPanel } from "@/app/modules/grant-platform/_components/grant-funders-panel";
import { GrantPipelineTable } from "@/app/modules/grant-platform/_components/grant-pipeline-table";
import { GrantWritingTipsPanel } from "@/app/modules/grant-platform/_components/grant-writing-tips-panel";
import {
  deleteGrantPlatformPartner,
  saveGrantPlatformOrganizationSettings,
  saveGrantPlatformPartner,
  saveGrantPlatformApplication,
  updateGrantPlatformApplicationStatus,
  withdrawGrantPlatformApplication,
} from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";
import { grantFocusAreaLabels, grantStatusLabels } from "@/lib/grants/domain";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { getGrantPlatformCollaborationChecklist, getGrantPlatformCollaborationNote, getGrantPlatformPipelineSnapshot } from "@/lib/grants/workflow";

type GrantPlatformTab = "pipeline" | "dashboard" | "finance" | "tips" | "calendar" | "funders" | "reports" | "partners" | "vault" | "settings";

const tabOptions = [
  { value: "pipeline", label: "Pipeline", icon: Users },
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "finance", label: "Funding & Budget", icon: ReceiptText },
  { value: "tips", label: "Writing Tips", icon: Sparkles },
  { value: "calendar", label: "Calendar", icon: CalendarClock },
  { value: "funders", label: "Funders", icon: ShieldCheck },
  { value: "reports", label: "Reports", icon: BarChart3 },
  { value: "partners", label: "Partners", icon: Users },
  { value: "vault", label: "Vault", icon: FolderOpen },
  { value: "settings", label: "Settings", icon: Settings2 },
] as const;

function resolveTab(value?: string): GrantPlatformTab {
  return value === "dashboard" || value === "finance" || value === "tips" || value === "calendar" || value === "funders" || value === "reports" || value === "partners" || value === "vault" || value === "settings"
    ? value
    : "pipeline";
}

function getSectionIcon(sectionId: string) {
  switch (sectionId) {
    case "pipeline":
      return Users;
    case "workflow":
      return Sparkles;
    case "reports":
      return BarChart3;
    default:
      return Settings2;
  }
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function getWorkflowSelection(data: GrantPlatformWorkspaceData) {
  const selectedRound =
    data.rounds.find((round) => round.existingApplicationId) ??
    data.rounds.find((round) => round.status === "open") ??
    data.rounds[0] ??
    null;

  const activeApplication = selectedRound
    ? data.applications.find((application) => application.id === selectedRound.existingApplicationId) ??
      data.applications.find((application) => application.roundId === selectedRound.id) ??
      null
    : null;

  return {
    activeApplication,
    selectedRound,
  };
}

export function ApplicationWorkflowDialog({ data }: { data: GrantPlatformWorkspaceData }) {
  const [open, setOpen] = useState(false);
  const [draftMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState("draft");
  const [noteValue, setNoteValue] = useState("");
  const { activeApplication, selectedRound } = getWorkflowSelection(data);
  const actionState = activeApplication
    ? data.workflowState[activeApplication.id]
    : null;

  const workflowStages = [
    {
      key: "draft",
      title: "Intake",
      description: "Draft and confirm the request details.",
      active: activeApplication?.status === "draft",
    },
    {
      key: "submitted",
      title: "Submitted",
      description: "The request is ready for review.",
      active: activeApplication?.status === "submitted",
    },
    {
      key: "in_review",
      title: "Under review",
      description: "Leadership and team review is underway.",
      active: activeApplication?.status === "in_review",
    },
    {
      key: "shortlisted",
      title: "Shortlisted",
      description: "The request is moving toward a decision.",
      active: activeApplication?.status === "shortlisted",
    },
    {
      key: "approved",
      title: "Approved",
      description: "Awarded and ready for follow-up.",
      active: activeApplication?.status === "approved",
    },
  ];

  async function handleStatusUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await updateGrantPlatformApplicationStatus(formData);

    if (result.success) {
      setStatusValue(String(formData.get("status") ?? "draft"));
      setNoteValue(String(formData.get("collaborationNote") ?? ""));
    }

    setStatusMessage(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className="gap-2 bg-slate-100 font-medium text-slate-800 hover:bg-slate-200"
        onClick={() => setOpen(true)}
      >
        <GitBranch className="size-4 text-olea-green" />
        Application Workflow
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GitBranch className="size-5 text-olea-green" />
            Application Workflow
          </DialogTitle>
          <DialogDescription>
            Track request stages, update workflow status, and submit grant applications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {workflowStages.map((stage) => (
              <div
                key={stage.key}
                className={`rounded-lg border p-3 ${
                  stage.active ? "border-olea-green bg-olea-light/50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="font-semibold text-slate-900">{stage.title}</p>
                <p className="mt-1 text-xs text-slate-600">{stage.description}</p>
              </div>
            ))}
          </div>

          {!selectedRound ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No grant rounds are currently accepting applications.
            </div>
          ) : activeApplication ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{activeApplication.roundName}</p>
                  <p className="text-xs text-slate-600">{activeApplication.focusArea}</p>
                </div>
                <Badge className="bg-white text-slate-700">{activeApplication.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">{activeApplication.summary}</p>

              <form onSubmit={handleStatusUpdate} className="mt-4 space-y-3 border-t border-slate-200 pt-3">
                <input type="hidden" name="applicationId" value={activeApplication.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Workflow status
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs"
                      name="status"
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value)}
                    >
                      <option value="draft">Draft (Intake)</option>
                      <option value="submitted">Submitted</option>
                      <option value="in_review">Under review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="approved">Approved</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Collaboration note
                    <Input
                      className="mt-1 h-9 text-xs"
                      name="collaborationNote"
                      placeholder="Add review notes..."
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                    />
                  </label>
                </div>
                <Button size="sm" type="submit" className="bg-navy-blue text-white">
                  Update status
                </Button>
                {statusMessage ? <p className="text-xs text-olea-green font-medium">{statusMessage}</p> : null}
              </form>

              {activeApplication.collaborationNote ? (
                <div className="mt-3 rounded border bg-white p-2.5 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">Latest team note:</p>
                  <p className="mt-1">{getGrantPlatformCollaborationNote(activeApplication.collaborationNote)}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <form action={saveGrantPlatformApplication} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="roundId" value={selectedRound.id} />
              <input type="hidden" name="focusArea" value={selectedRound.programType ?? "Community"} />
              <p className="font-semibold text-slate-900 text-sm">Submit new request for {selectedRound.name}</p>
              <label className="block text-xs text-slate-700">
                Requested amount (CAD)
                <Input className="mt-1 text-xs" name="requestedAmount" placeholder="50000" type="number" />
              </label>
              <label className="block text-xs text-slate-700">
                Summary
                <Textarea className="mt-1 text-xs" defaultValue="Expansion of youth leadership mentorship program across regional centers." name="summary" />
              </label>
              <label className="block text-xs text-slate-700">
                Expected outcome
                <Textarea className="mt-1 text-xs" defaultValue="This investment will allow us to strengthen delivery and report measurable impact." name="expectedOutcome" />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" name="intent" type="submit" value="draft" variant="outline">
                  Save draft
                </Button>
                <Button size="sm" name="intent" type="submit" value="submit" className="bg-olea-green text-white">
                  <Send className="mr-1.5 size-3.5" />
                  Submit application
                </Button>
              </div>
            </form>
          )}
          {draftMessage ? <p className="text-xs text-olea-green">{draftMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrencyDisplay(cents: number | null) {
  if (cents === null) return "$0";

  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function OrganizationSettingsPanel({
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
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Team Members & Permissions</h3>
            <p className="mt-1 text-sm text-slate-600">Manage who has access to the platform and what they can do.</p>
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 font-semibold text-slate-900">Permission Levels:</p>
            <div className="space-y-1 text-sm leading-7 text-slate-600">
              <p><strong>Admin:</strong> Full access - manage everything, team members, settings</p>
              <p><strong>Grant Manager:</strong> Edit grants, view all, add team notes, no budget edits</p>
              <p><strong>Finance:</strong> View all grants, edit budgets, review reports, no grant edits</p>
              <p><strong>Partner:</strong> View/edit only their own grants, add notes</p>
              <p><strong>Viewer:</strong> Read-only access to reports and pipeline</p>
            </div>
          </div>
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
                <select
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                  defaultValue={data.organizationSettings.organizationType}
                  disabled={disabled}
                  name="organizationType"
                >
                  <option>Grassroots (under $250K/yr)</option>
                  <option>Growing ($250K-$1M)</option>
                  <option>Established ($1M+)</option>
                </select>
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

function PartnerDialog({
  canEditOrgProfile,
  onOpenChange,
  open,
  partner,
}: {
  canEditOrgProfile: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  partner: GrantPlatformWorkspaceData["partners"][number] | null;
}) {
  const [partnerState, partnerFormAction] = useFormState(saveGrantPlatformPartner, {
    message: "",
    success: false,
  });
  const [, deleteFormAction] = useFormState(deleteGrantPlatformPartner, {
    message: "",
    success: false,
  });
  const title = partner ? "✏️ Edit Partner Details" : "+ Add Partner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Track organizations, institutions, and individuals who can collaborate on future grant opportunities.
          </DialogDescription>
        </DialogHeader>
        <form key={partner?.id ?? "new-partner"} id="partner-form" action={partnerFormAction} className="space-y-4">
          <input name="partnerId" type="hidden" value={partner?.id ?? ""} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Partner Name
              <Input disabled={!canEditOrgProfile} name="partnerName" placeholder="Organization or individual name" defaultValue={partner?.name ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Partner Type
              <select disabled={!canEditOrgProfile} name="partnerType" defaultValue={partner?.partnerType ?? "Community Organization"} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100">
                <option>Community Organization</option>
                <option>Academic Institution</option>
                <option>Government Agency</option>
                <option>Individual / Board Advisor</option>
                <option>For-Profit Partner</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Name of primary contact
              <Input disabled={!canEditOrgProfile} name="partnerContact" placeholder="Name of primary contact" defaultValue={partner?.contactName ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Email
              <Input disabled={!canEditOrgProfile} name="partnerEmail" placeholder="email@example.com" type="email" defaultValue={partner?.email ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Phone
              <Input disabled={!canEditOrgProfile} name="partnerPhone" placeholder="(604) 555-0000" type="tel" defaultValue={partner?.phone ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Focus Areas
              <Input disabled={!canEditOrgProfile} name="partnerFocus" placeholder="e.g., Arts, Culture, Youth Programs (comma-separated)" defaultValue={partner?.focusAreas ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Status
              <select disabled={!canEditOrgProfile} name="partnerStatus" defaultValue={partner?.status ?? "Active Collaborator"} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100">
                <option>Active Collaborator</option>
                <option>Good for Evaluation</option>
                <option>Strategic Partner</option>
                <option>Potential Collaborator</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <strong>📝 Partner Notes & History</strong>
              <Textarea disabled={!canEditOrgProfile} name="partnerNotes" placeholder="Add notes about this partnership: what they're good at, collaboration history, key contacts, follow-up items, etc." defaultValue={partner?.notes ?? ""} className="min-h-[120px]" />
              <p className="text-xs text-slate-500">Use this space to track partnership history, what works well, challenges, and ideas for future collaboration.</p>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Last collaboration
              <Input disabled={!canEditOrgProfile} name="partnerLastCollaboration" placeholder="Last collaborated: ..." defaultValue={partner?.lastCollaboration ?? ""} />
            </label>
          </div>
          <input name="partnerAddedNote" type="hidden" value={partner?.addedNote ?? ""} />
          {partnerState.message ? (
            <p className={`text-sm ${partnerState.success ? "text-olea-green" : "text-red-600"}`}>{partnerState.message}</p>
          ) : null}
        </form>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          {partner ? (
            <form action={deleteFormAction}>
              <input name="partnerId" type="hidden" value={partner.id} />
              <Button disabled={!canEditOrgProfile} type="submit" variant="destructive">
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </form>
          ) : null}
          <Button disabled={!canEditOrgProfile} form="partner-form" type="submit">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartnersPanel({
  canEditOrgProfile,
  data,
}: {
  canEditOrgProfile: boolean;
  data: GrantPlatformWorkspaceData;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const selectedPartner = useMemo(
    () => data.partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [data.partners, selectedPartnerId],
  );

  return (
    <div className="space-y-5">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">👥 Partners & Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm text-slate-600">Track organizations, institutions, and individuals who can collaborate on future grant opportunities.</p>
          <Button
            className="mb-5"
            disabled={!canEditOrgProfile}
            onClick={() => {
              setSelectedPartnerId(null);
              setDialogOpen(true);
            }}
          >
            + Add Partner
          </Button>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.partners.map((partner) => (
              <div
                key={partner.id}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-olea-green hover:shadow-md"
                onClick={() => {
                  setSelectedPartnerId(partner.id);
                  setDialogOpen(true);
                }}
              >
                <h4 className="mb-2 text-base font-semibold text-slate-900">👤 {partner.name}</h4>
                <p className="mb-3 text-xs text-slate-600"><strong>Type:</strong> {partner.partnerType}</p>
                <p className="mb-3 text-xs text-slate-600"><strong>Contact:</strong> {partner.contactName}</p>
                <p className="mb-3 text-xs text-slate-600"><strong>Email:</strong> {partner.email}</p>
                <p className="mb-3 text-xs text-slate-600"><strong>Focus Areas:</strong> {partner.focusAreas}</p>
                <p className="font-bold text-olea-green">{partner.status}</p>
                <p className="mt-2 text-[11px] text-slate-500">{partner.lastCollaboration ?? partner.addedNote ?? "Click to edit"}</p>
                <p className="mt-2 text-[11px] italic text-olea-orange">👆 Click to edit</p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-lg font-semibold text-slate-900">How to Use This</h3>
          <div className="mt-4 rounded-lg border-l-4 border-olea-green bg-olea-light p-4">
            <p className="mb-2 text-sm text-slate-700"><strong>Track Potential Partners:</strong> Add organizations you want to collaborate with on future grants</p>
            <p className="mb-2 text-sm text-slate-700"><strong>Note Their Strengths:</strong> Document what they&apos;re good at (evaluation, community reach, research, etc.)</p>
            <p className="mb-2 text-sm text-slate-700"><strong>Keep Contact Info:</strong> Store emails and contacts in one place</p>
            <p className="text-sm text-slate-700"><strong>Reference When Planning Grants:</strong> When researching new opportunities, check here to see which partners might be a good fit</p>
          </div>
        </CardContent>
      </Card>

      <PartnerDialog canEditOrgProfile={canEditOrgProfile} onOpenChange={setDialogOpen} open={dialogOpen} partner={selectedPartner} />
    </div>
  );
}

function VaultPanel({ data }: { data: GrantPlatformWorkspaceData }) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">📁 Cross-Grant File Vault</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="bg-olea-orange text-white hover:bg-olea-orange/90">
          📎 Upload to Vault
        </Button>
        <p className="text-sm text-slate-600">Store reusable files, templates, and resources that can be used across multiple grants.</p>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 font-semibold text-slate-900">📁 Vault Files</div>
          <div className="divide-y divide-slate-200">
            {data.vaultItems.map((item) => (
              <div key={item.id} className="p-4">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="font-bold text-slate-900">📄 {item.fileName}</span>
                  <span className="text-xs text-slate-500">Uploaded: {new Date(item.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <p className="mb-3 text-xs text-slate-600">{item.contentType ?? "Reusable file"}</p>
                <div className="flex gap-2">
                  <Button className="bg-olea-orange text-white hover:bg-olea-orange/90" size="sm" type="button">
                    Download
                  </Button>
                  <Button size="sm" type="button" variant="outline">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-olea-green bg-olea-light p-4">
          <p className="mb-2 font-semibold text-slate-900">Vault Tips:</p>
          <p className="mb-2 text-sm text-slate-600">✓ Store templates and reusable documents here</p>
          <p className="mb-2 text-sm text-slate-600">✓ Download files when working on a grant</p>
          <p className="text-sm text-slate-600">✓ Keep files updated as best practices evolve</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function GrantPlatformWorkspace({
  activeTab,
  data,
  role = "admin",
}: {
  activeTab?: string;
  data: GrantPlatformWorkspaceData;
  role?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<GrantPlatformTab>(resolveTab(activeTab));
  const { canEditGrants, canEditOrgProfile, canManageTeam, canViewBoard, canViewBudgets, canViewReports, normalizedRole } = getGrantPlatformUiAccess(role);

  function changeTab(value: string) {
    const nextTab = resolveTab(value);
    setTab(nextTab);
    router.replace(`/modules/grant-platform?tab=${nextTab}`, { scroll: false });
  }

  return (
    <section className="space-y-6" data-testid="grant-platform-workspace">
      <header className="overflow-hidden rounded-2xl border border-olea-green/20 bg-gradient-to-br from-olea-green/10 via-white to-olea-light p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="border-olea-green/20 bg-white text-olea-green shadow-sm">
              Grant Platform
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              Grant platform workspace
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">{data.summary}</p>
            <p className="mt-3 text-sm font-medium text-slate-700">
              Prepared for {data.organizationName}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white text-slate-700 shadow-sm">
                {normalizedRole.replace("_", " ").toUpperCase()}
              </Badge>
              {canViewReports || canViewBoard ? (
                <Button variant="outline" className="w-fit">
                  Review module
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              ) : null}
            </div>
            <p className="text-sm text-slate-500">
              Built for funder-facing delivery, board reporting, and collaborative execution.
            </p>
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
        <div className="rounded-xl border bg-white p-3 shadow-soft">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-olea-light/50">
            {tabOptions.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2 px-4 py-3">
                <Icon className="size-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="pipeline" className="space-y-5">
          <GrantPipelineTable canEditGrants={canEditGrants} data={data} onSwitchTab={changeTab} />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-5">
          <GrantDashboardPanel />
        </TabsContent>

        <TabsContent value="finance" className="space-y-5">
          <GrantFinancePanel />
        </TabsContent>

        <TabsContent value="tips" className="space-y-5">
          <GrantWritingTipsPanel />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-5">
          <GrantCalendarPanel />
        </TabsContent>

        <TabsContent value="funders" className="space-y-5">
          <GrantFundersPanel />
        </TabsContent>

        <TabsContent value="reports" className="space-y-5">
          {!canViewReports ? (
            <Card className="shadow-soft">
              <CardContent className="p-6 text-sm text-slate-600">
                You do not currently have access to the reporting view for this workspace.
              </CardContent>
            </Card>
          ) : null}
          {canViewReports ? (
            <div className="space-y-6">
              <GrantFunderReportsPanel />
              <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Recent applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.applications.length ? (
                  data.applications.map((application) => (
                    <div key={application.id} className="rounded-lg border bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{application.roundName}</p>
                          <p className="text-sm text-slate-600">{application.focusArea}</p>
                        </div>
                        <Badge className="bg-white text-slate-700">{application.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                        <span>Requested: ${(application.requestedAmountCents / 100).toLocaleString()}</span>
                        <span>Updated: {new Date(application.updatedAt).toLocaleDateString()}</span>
                        <span>Award: {application.awardStatus ?? "pending"}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{application.summary}</p>
                      <p className="mt-2 text-sm font-medium text-olea-green">Next: {application.nextMilestone}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No applications have been submitted yet.</p>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Leadership clarity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Keep financial, program, and narrative updates aligned for funders and leadership.</p>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Board-ready checkpoints</p>
                  <ul className="mt-2 space-y-2">
                    <li>• Confirm the current status, requested amount, and milestone readiness.</li>
                    <li>• Highlight any narrative or evidence gaps before the next review.</li>
                    <li>• Keep an auditable trail of the latest updates and decisions.</li>
                  </ul>
                </div>
                {data.applications.length ? (() => {
                  const application = data.applications[0];
                  const snapshot = getGrantPlatformPipelineSnapshot(application?.status, application?.deadlineAt ?? null);
                  return (
                    <div className="rounded-lg border border-olea-green/20 bg-olea-light/60 p-3">
                      <p className="font-semibold text-slate-900">Current focus</p>
                      <p className="mt-2 text-sm text-slate-600">{snapshot.stage}: {snapshot.milestone}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{snapshot.urgency}</p>
                      {application?.deadlineAt ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Deadline: {new Date(application.deadlineAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  );
                })() : null}
              </CardContent>
            </Card>
            </div>
          </div>
          ) : null}
        </TabsContent>

        <TabsContent value="partners" className="space-y-5">
          <PartnersPanel canEditOrgProfile={canEditOrgProfile} data={data} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-5">
          <OrganizationSettingsPanel canEditOrgProfile={canEditOrgProfile} canManageTeam={canManageTeam} data={data} />
        </TabsContent>

        <TabsContent value="vault" className="space-y-5">
          <VaultPanel data={data} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
