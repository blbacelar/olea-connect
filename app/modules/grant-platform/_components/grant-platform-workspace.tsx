"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleCheckBig,
  FileText,
  LayoutGrid,
  ReceiptText,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AddGrantDialog } from "@/app/modules/grant-platform/_components/add-grant-dialog";
import {
  saveGrantPlatformApplication,
  updateGrantPlatformApplicationStatus,
  withdrawGrantPlatformApplication,
} from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";
import { grantFocusAreaLabels, grantStatusLabels } from "@/lib/grants/domain";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { getGrantPlatformCollaborationChecklist, getGrantPlatformCollaborationNote, getGrantPlatformPipelineSnapshot } from "@/lib/grants/workflow";

type GrantPlatformTab = "overview" | "pipeline" | "reports" | "settings";

const tabOptions = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "pipeline", label: "Pipeline", icon: Users },
  { value: "reports", label: "Reports", icon: BarChart3 },
  { value: "settings", label: "Settings", icon: Settings2 },
] as const;

function resolveTab(value?: string): GrantPlatformTab {
  return value === "pipeline" || value === "reports" || value === "settings"
    ? value
    : "overview";
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

function ApplicationWorkflowPanel({ data }: { data: GrantPlatformWorkspaceData }) {
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
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">Application workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          Save a draft or submit a live application from the same workspace that tracks your funding pipeline and reporting readiness.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {workflowStages.map((stage) => (
            <div key={stage.key} className={`rounded-lg border p-3 ${stage.active ? "border-olea-green bg-olea-light/50" : "border-slate-200 bg-white"}`}>
              <p className="font-semibold text-slate-900">{stage.title}</p>
              <p className="mt-1 text-sm text-slate-600">{stage.description}</p>
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
                <p className="text-sm text-slate-600">{grantStatusLabels[activeApplication.status as keyof typeof grantStatusLabels] ?? activeApplication.status}</p>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p>{formatCurrency(activeApplication.requestedAmountCents)}</p>
                <p className="text-xs text-slate-500">Requested amount</p>
              </div>
            </div>
            {actionState ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                {actionState.canEdit ? <span className="rounded-full bg-olea-light px-2.5 py-1 text-olea-green">Draft editing enabled</span> : null}
                {actionState.canWithdraw ? <span className="rounded-full bg-white px-2.5 py-1">Withdraw available</span> : null}
                {actionState.canReview ? <span className="rounded-full bg-white px-2.5 py-1">Leadership review active</span> : null}
              </div>
            ) : null}
            {actionState?.canWithdraw ? (
              <form action={withdrawGrantPlatformApplication} className="mt-4">
                <input name="applicationId" type="hidden" value={activeApplication.id} />
                <Button size="sm" type="submit" variant="outline">
                  Withdraw application
                </Button>
              </form>
            ) : null}
            <form className="mt-4 space-y-3" onSubmit={handleStatusUpdate}>
              <div className="flex flex-wrap items-center gap-2">
                <input name="applicationId" type="hidden" value={activeApplication.id} />
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  name="status"
                  onChange={(event) => setStatusValue(event.target.value)}
                  value={statusValue}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="in_review">In review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <Button size="sm" type="submit" variant="outline">
                  Update status
                </Button>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Collaboration note
                <Textarea
                  className="mt-2 min-h-[90px]"
                  name="collaborationNote"
                  onChange={(event) => setNoteValue(event.target.value)}
                  placeholder="Note the follow-up, owner, or board prep item."
                  value={noteValue}
                />
              </label>
            </form>
            {statusMessage ? <p className="mt-2 text-sm text-olea-green">{statusMessage}</p> : null}
            {getGrantPlatformCollaborationNote(activeApplication.collaborationNote ?? null) ? (
              <div className="mt-4 rounded-lg border border-olea-green/20 bg-olea-light/60 p-4">
                <p className="font-semibold text-slate-900">Saved follow-up note</p>
                <p className="mt-2 text-sm text-slate-600">{getGrantPlatformCollaborationNote(activeApplication.collaborationNote ?? null)}</p>
              </div>
            ) : null}
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">Next actions</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {getGrantPlatformCollaborationChecklist(activeApplication.status, activeApplication.deadlineAt ?? null).map((item) => (
                  <li key={item.title} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <form action={saveGrantPlatformApplication} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <input name="roundId" type="hidden" value={selectedRound?.id ?? ""} />
            <label className="block text-sm font-semibold text-slate-700">
              Focus area
              <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue="operational_capacity" name="focusArea">
                {Object.entries(grantFocusAreaLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Requested amount (CAD)
              <Input className="mt-2" defaultValue="5000" min="1" name="requestedAmount" type="number" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Annual revenue (CAD)
              <Input className="mt-2" defaultValue="100000" min="0" name="annualRevenue" type="number" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Narrative
              <Textarea className="mt-2 min-h-[140px]" defaultValue="We are preparing a focused request to expand our operational capacity and support the delivery of programs for the community we serve." name="fundingRequest" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Expected outcome
              <Textarea className="mt-2" defaultValue="This investment will allow us to strengthen delivery and report measurable impact to our supporters." name="expectedOutcome" />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button name="intent" type="submit" value="draft" variant="outline">
                Save draft
              </Button>
              <Button name="intent" type="submit" value="submit">
                <Send className="mr-2 size-4" />
                Submit application
              </Button>
            </div>
          </form>
        )}
        {draftMessage ? <p className="text-sm text-olea-green">{draftMessage}</p> : null}
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
  const { canEditGrants, canEditTeamNotes, canViewBoard, canViewBudgets, canViewReports, normalizedRole } = getGrantPlatformUiAccess(role);

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

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((item) => {
              const Icon = item.label === "Open rounds" ? FileText : item.label === "Applications" ? ReceiptText : item.label === "Awarded" ? CircleCheckBig : CalendarClock;
              return (
                <Card key={item.label} className="shadow-soft">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="grid size-10 place-items-center rounded-xl bg-olea-light text-olea-green">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.sections.map((section) => {
              const Icon = getSectionIcon(section.id);
              return (
                <Card key={section.id} className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="grid size-8 place-items-center rounded-lg bg-olea-light text-olea-green">
                        <Icon className="size-4" />
                      </span>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-6 text-slate-600">{section.description}</p>
                    <ul className="space-y-2">
                      {section.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2 text-sm text-slate-600">
                          <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <ApplicationWorkflowPanel data={data} />
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Funding rounds</CardTitle>
                {canEditGrants ? <AddGrantDialog /> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {data.rounds.length ? (
                  data.rounds.map((round) => (
                    <div key={round.id} className="rounded-lg border bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{round.name}</p>
                          <p className="text-sm text-slate-600">{round.programName} • {round.programType}</p>
                        </div>
                        <Badge className="bg-white text-slate-700">{round.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{round.description}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                        <span>Closes: {round.closesAt ? new Date(round.closesAt).toLocaleDateString() : "TBD"}</span>
                        <span>Budget: ${(round.budgetCents / 100).toLocaleString()}</span>
                        <span>Awards: {round.availableAwards}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No grant rounds are available yet.</p>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Workflow stages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    title: "Intake and eligibility",
                    description: "Confirm the organization, round fit, and readiness to proceed.",
                    status: "active",
                  },
                  {
                    title: "Drafting and evidence",
                    description: "Build the narrative, gather documents, and prepare the package.",
                    status: "up-next",
                  },
                  {
                    title: "Submission and tracking",
                    description: "Submit the request and monitor delivery against deadlines.",
                    status: "up-next",
                  },
                  {
                    title: "Review and decision",
                    description: "Coordinate leadership and board review before final direction.",
                    status: "up-next",
                  },
                ].map((stage) => (
                  <div key={stage.title} className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{stage.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{stage.description}</p>
                      </div>
                      <Badge className={stage.status === "active" ? "bg-olea-light text-olea-green" : "bg-white text-slate-700"}>
                        {stage.status === "active" ? "Active" : "Next"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
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
          ) : null}
        </TabsContent>

        <TabsContent value="settings" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Workspace configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <p>Use the organization context and current round data as the source of truth for grant operations.</p>
                <div className="space-y-3">
                  {[
                    {
                      title: "Application workflow",
                      description: "Choose how new requests move from draft to submission and review.",
                      details: ["Draft and submit controls", "Round-based review sequencing", "Editable or locked submission states"],
                    },
                    {
                      title: "Reporting cadence",
                      description: "Define how the team tracks updates, deliverables, and board-facing summaries.",
                      details: ["Milestone reminders", "Leadership reporting checkpoints", "Export-ready summary bundles"],
                    },
                    {
                      title: "Team access",
                      description: "Manage who can view, edit, or review active grant work.",
                      details: ["Role-based visibility", "Staff and reviewer permissions", "Shared collaboration ownership"],
                    },
                    {
                      title: "Collaboration notes",
                      description: "Keep the latest planning, evidence, and decision notes visible to the grant team.",
                      details: ["Shared follow-up guidance", "Deadline and review reminders", "Board-facing preparation prompts"],
                    },
                  ].map((option) => (
                    <div key={option.title} className="rounded-lg border bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{option.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                      <ul className="mt-3 space-y-2">
                        {option.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-2">
                            <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="size-4 text-olea-green" />
                  Security and access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Access remains controlled and scoped to the same standards used in the rest of the platform.</p>
                {!canEditTeamNotes ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Collaboration notes are view-only for your current role.
                  </div>
                ) : null}
                <div className="rounded-lg border border-olea-green/20 bg-olea-light/50 p-4">
                  <p className="font-semibold text-slate-900">Platform safeguards</p>
                  <ul className="mt-2 space-y-2">
                    <li>Role-based visibility for sensitive funding work</li>
                    <li>Clear review paths for leadership and program staff</li>
                    <li>Consistent auditability for board-facing reporting</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
