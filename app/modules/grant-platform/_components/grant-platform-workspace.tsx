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

import {
  saveGrantPlatformApplication,
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
  const { activeApplication, selectedRound } = getWorkflowSelection(data);
  const actionState = activeApplication
    ? data.workflowState[activeApplication.id]
    : null;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">Application workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          Save a draft or submit a live application from the same workspace that tracks your funding pipeline and reporting readiness.
        </p>
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
}: {
  activeTab?: string;
  data: GrantPlatformWorkspaceData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<GrantPlatformTab>(resolveTab(activeTab));

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
            <Button variant="outline" className="w-fit">
              Review module
              <ArrowRight className="ml-2 size-4" />
            </Button>
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
              <CardHeader>
                <CardTitle className="text-lg">Funding rounds</CardTitle>
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
                <CardTitle className="text-lg">Execution rhythm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Review the next deadline and assign owners.",
                  "Prepare the draft package with the latest evidence.",
                  "Share the board-ready summary with leadership before close.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-olea-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-5">
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
                <p className="rounded-lg border bg-slate-50 p-3">Every report can be exported or reviewed without leaving the workspace.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Workspace configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Use the organization context and current round data as the source of truth for grant operations.</p>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Included details</p>
                  <ul className="mt-2 space-y-2">
                    <li className="flex items-start gap-2">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>Organization-specific grant operations context</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>Current funding round visibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>Leadership review and reporting readiness</span>
                    </li>
                  </ul>
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
