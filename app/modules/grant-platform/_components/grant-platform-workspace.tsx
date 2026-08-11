"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleCheckBig,
  FileText,
  FolderOpen,
  GitBranch,
  HelpCircle,
  LayoutGrid,
  Paperclip,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
                    <input type="hidden" name="status" value={statusValue} />
                    <Select value={statusValue} onValueChange={setStatusValue}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft (Intake)</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="in_review">Under review</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
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
  const [partnerType, setPartnerType] = useState(partner?.partnerType ?? "Community Organization");
  const [partnerStatus, setPartnerStatus] = useState(partner?.status ?? "Active Collaborator");
  const title = partner ? "Edit Partner Details" : "Add Partner";

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
            <div className="space-y-2 text-sm font-medium text-slate-700">
              <label>Partner Type</label>
              <input type="hidden" name="partnerType" value={partnerType} />
              <Select disabled={!canEditOrgProfile} value={partnerType} onValueChange={setPartnerType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select partner type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Community Organization">Community Organization</SelectItem>
                  <SelectItem value="Academic Institution">Academic Institution</SelectItem>
                  <SelectItem value="Government Agency">Government Agency</SelectItem>
                  <SelectItem value="Individual / Board Advisor">Individual / Board Advisor</SelectItem>
                  <SelectItem value="For-Profit Partner">For-Profit Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <label>Status</label>
              <input type="hidden" name="partnerStatus" value={partnerStatus} />
              <Select disabled={!canEditOrgProfile} value={partnerStatus} onValueChange={setPartnerStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active Collaborator">Active Collaborator</SelectItem>
                  <SelectItem value="Good for Evaluation">Good for Evaluation</SelectItem>
                  <SelectItem value="Strategic Partner">Strategic Partner</SelectItem>
                  <SelectItem value="Potential Collaborator">Potential Collaborator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <strong>Partner Notes & History</strong>
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
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-olea-green" />
            Partners & Collaborators
          </CardTitle>
          <div className="group relative">
            <button
              type="button"
              className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
              aria-label="How to use partners"
            >
              <HelpCircle className="size-4" />
            </button>
            <div className="pointer-events-none absolute right-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
              <p className="mb-2 font-bold text-slate-900 text-xs">How to Use This</p>
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Track Potential Partners:</strong> Add organizations you want to collaborate with on future grants.</p>
                <p><strong>Note Their Strengths:</strong> Document what they&apos;re good at (evaluation, community reach, research, etc.).</p>
                <p><strong>Keep Contact Info:</strong> Store emails and contacts in one place.</p>
                <p><strong>Reference When Planning Grants:</strong> When researching new opportunities, check here to see which partners might be a good fit.</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <p className="text-sm text-slate-600">Track organizations, institutions, and individuals who can collaborate on future grant opportunities.</p>
            <Button
              className="bg-olea-green text-white hover:bg-olea-green/90"
              disabled={!canEditOrgProfile}
              onClick={() => {
                setSelectedPartnerId(null);
                setDialogOpen(true);
              }}
            >
              + Add Partner
            </Button>
          </div>

          {/* Partners Data Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="w-[220px]">Partner Name</TableHead>
                  <TableHead className="w-[180px]">Type</TableHead>
                  <TableHead className="w-[200px]">Primary Contact & Email</TableHead>
                  <TableHead>Focus Areas</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.partners.length ? (
                  data.partners.map((partner) => (
                    <TableRow
                      key={partner.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() => {
                        setSelectedPartnerId(partner.id);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {partner.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700">
                          {partner.partnerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 space-y-0.5">
                        <p className="font-medium text-slate-800">{partner.contactName}</p>
                        <p className="text-slate-500">{partner.email}</p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {partner.focusAreas}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 font-bold text-emerald-800 text-[11px]">
                          {partner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPartnerId(partner.id);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      No partners recorded yet. Click &quot;+ Add Partner&quot; to register your first partner organization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PartnerDialog canEditOrgProfile={canEditOrgProfile} onOpenChange={setDialogOpen} open={dialogOpen} partner={selectedPartner} />
    </div>
  );
}

function VaultPanel({ data }: { data: GrantPlatformWorkspaceData }) {
  const [vaultItems, setVaultItems] = useState(data.vaultItems);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState("");
  const [contentTypeInput, setContentTypeInput] = useState("Grant Template / Narrative");

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNameInput.trim()) return;

    const newItem = {
      id: `vault-custom-${Date.now()}`,
      fileName: fileNameInput.trim(),
      contentType: contentTypeInput,
      sizeBytes: 1024 * 512,
      createdAt: new Date().toISOString(),
    };

    setVaultItems((prev) => [newItem, ...prev]);
    setFileNameInput("");
    setUploadDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    setVaultItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="size-5 text-olea-green" />
              Cross-Grant File Vault
            </CardTitle>
            <div className="group relative">
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
                aria-label="Vault tips"
              >
                <HelpCircle className="size-4" />
              </button>
              <div className="pointer-events-none absolute left-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                <p className="mb-2 font-bold text-slate-900 text-xs">Vault Tips & Guidance</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p>• Store templates and reusable documents here.</p>
                  <p>• Download files when working on a grant opportunity.</p>
                  <p>• Keep files updated as best practices evolve.</p>
                </div>
              </div>
            </div>
          </div>
          <Button
            type="button"
            className="gap-2 bg-olea-orange text-white hover:bg-olea-orange/90"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Paperclip className="size-4" />
            Upload to Vault
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-slate-600">Store reusable files, templates, and resources that can be used across multiple grants.</p>

        {/* Vault Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
          <Table>
            <TableHeader className="bg-slate-100/70">
              <TableRow>
                <TableHead className="w-[300px]">File Name</TableHead>
                <TableHead>Category / Type</TableHead>
                <TableHead className="w-[160px]">Uploaded Date</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaultItems.length ? (
                vaultItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-olea-green shrink-0" />
                        <span>{item.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {item.contentType ?? "Reusable file"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          type="button"
                          className="bg-olea-orange text-white hover:bg-olea-orange/90 text-xs h-8"
                          onClick={() => alert(`Downloading "${item.fileName}"...`)}
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          className="text-xs h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-slate-500">
                    No files uploaded to vault yet. Click &quot;Upload to Vault&quot; to add your first document.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Upload Modal Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="size-5 text-olea-orange" />
                Upload File to Cross-Grant Vault
              </DialogTitle>
              <DialogDescription>
                Add reusable templates, organizational policies, or budgets to the central vault.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Document Title / File Name</label>
                <Input
                  placeholder="e.g. 2026 Master Budget Template.xlsx"
                  value={fileNameInput}
                  onChange={(e) => setFileNameInput(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Document Category</label>
                <Select value={contentTypeInput} onValueChange={setContentTypeInput}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grant Template / Narrative">Grant Template / Narrative</SelectItem>
                    <SelectItem value="Financial Budget / Audit">Financial Budget / Audit</SelectItem>
                    <SelectItem value="Board Resolution / Governance">Board Resolution / Governance</SelectItem>
                    <SelectItem value="Letters of Support">Letters of Support</SelectItem>
                    <SelectItem value="Impact & Evaluation Metrics">Impact & Evaluation Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Choose File</label>
                <Input type="file" className="text-xs cursor-pointer" />
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-olea-orange text-white hover:bg-olea-orange/90">
                  Upload Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-lg">Leadership clarity</CardTitle>
                <div className="group relative">
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
                    aria-label="Leadership clarity help"
                  >
                    <HelpCircle className="size-4" />
                  </button>
                  <div className="pointer-events-none absolute right-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                    <p className="mb-2 font-bold text-slate-900 text-xs">Leadership Clarity Guidelines</p>
                    <p className="mb-2 text-xs text-slate-600">Keep financial, program, and narrative updates aligned for funders and leadership.</p>
                    <p className="font-semibold text-slate-900 text-xs mb-1">Board-ready checkpoints:</p>
                    <ul className="space-y-1 text-xs text-slate-600">
                      <li>• Confirm current status, requested amount, and milestone readiness.</li>
                      <li>• Highlight narrative or evidence gaps before review.</li>
                      <li>• Keep an auditable trail of updates and decisions.</li>
                    </ul>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
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
                })() : (
                  <p className="text-xs text-slate-500">No active application focus tracked.</p>
                )}
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
