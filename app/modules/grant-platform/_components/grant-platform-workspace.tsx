"use client";

import {
  BarChart3,
  CalendarClock,
  FolderOpen,
  HelpCircle,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GrantCalendarPanel } from "@/app/modules/grant-platform/_components/grant-calendar-panel";
import { GrantDashboardPanel } from "@/app/modules/grant-platform/_components/grant-dashboard-panel";
import { GrantFinancePanel } from "@/app/modules/grant-platform/_components/grant-finance-panel";
import { GrantFunderReportsPanel } from "@/app/modules/grant-platform/_components/grant-funder-reports-panel";
import { GrantFundersPanel } from "@/app/modules/grant-platform/_components/grant-funders-panel";
import { GrantPipelineTable } from "@/app/modules/grant-platform/_components/grant-pipeline-table";
import { GrantWritingTipsPanel } from "@/app/modules/grant-platform/_components/grant-writing-tips-panel";
import { OrganizationSettingsPanel } from "@/app/modules/grant-platform/_components/organization-settings-panel";
import { PartnersPanel } from "@/app/modules/grant-platform/_components/partners-panel";
import { VaultPanel } from "@/app/modules/grant-platform/_components/vault-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { getGrantPlatformPipelineSnapshot } from "@/lib/grants/workflow";

export { ApplicationWorkflowDialog } from "@/app/modules/grant-platform/_components/application-workflow-dialog";

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
  const { canEditGrants, canEditOrgProfile, canManageTeam, canViewReports } = getGrantPlatformUiAccess(role);

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
