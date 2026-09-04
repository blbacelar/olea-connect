"use client";

import { BarChart3, ClipboardList, Settings } from "lucide-react";
import Link from "next/link";

import { KpiDashboardExportButton } from "@/app/modules/kpi-dashboard/_components/kpi-dashboard-export-button";
import { resolveKpiDashboardTab } from "@/app/modules/kpi-dashboard/tab-state";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { KpiDashboardData } from "@/lib/data/kpi-dashboard";
import { cn } from "@/lib/utils";

import { AnnualSummaryTab } from "./kpi-annual-summary-tab";
import { BoardDashboardTab } from "./kpi-board-dashboard-tab";
import { quarterValues } from "./kpi-dashboard-ui";
import { MilestonesAndRisksTab } from "./kpi-milestones-risks-tab";
import { QuarterTrackerTab } from "./kpi-quarter-tracker-tab";
import { SettingsTab, SetupTab } from "./kpi-setup-tabs";

const tabOptions = [
  { value: "board", label: "Board Dashboard" },
  { value: "q1", label: "Q1 Tracker" },
  { value: "q2", label: "Q2 Tracker" },
  { value: "q3", label: "Q3 Tracker" },
  { value: "q4", label: "Q4 Tracker" },
  { value: "milestones", label: "Milestones & Risks" },
  { value: "annual", label: "Annual Summary" },
  { value: "setup", label: "Setup" },
  { value: "settings", label: "Settings" },
] as const;

export function KpiDashboardWorkspace({
  activeTab,
  data,
}: {
  activeTab: string;
  data: KpiDashboardData;
}) {
  const safeTab = resolveKpiDashboardTab(
    activeTab,
    Boolean(data.dashboard.financialYearEnd),
  );

  return (
    <div className="space-y-5">
      <KpiDashboardHero data={data} />
      <Tabs value={safeTab}>
        <KpiTabNavigation safeTab={safeTab} />
        <KpiTabContent data={data} />
      </Tabs>
    </div>
  );
}

function KpiDashboardHero({ data }: { data: KpiDashboardData }) {
  return (
    <Card className="border-olea-green/15 bg-gradient-to-br from-white to-olea-light/50 shadow-soft">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-olea-green">
              Board reporting
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-4xl">
              {data.dashboard.title}
            </h1>
            <p className="mt-3 max-w-4xl text-lg leading-8 text-slate-600">
              Define KPIs, customize reporting quarters, capture quarterly
              results, and prepare board-ready annual reporting from one
              connected workspace.
            </p>
            <p className="mt-3 text-slate-600">
              {data.dashboard.organizationName} · Reporting year{" "}
              {data.dashboard.reportingYear}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <KpiDashboardExportButton />
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              {data.kpis.length} KPI{data.kpis.length === 1 ? "" : "s"} tracked
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiTabNavigation({ safeTab }: { safeTab: string }) {
  return (
    <nav
      aria-label="KPI dashboard sections"
      className="scrollbar-hide overflow-x-auto rounded-xl border bg-white p-2 shadow-soft"
      data-testid="kpi-dashboard-tabs"
    >
      <div className="flex h-auto min-w-max justify-start gap-1 rounded-lg bg-olea-light/70 p-1">
        {tabOptions.map((tab) => (
          <Link
            aria-current={safeTab === tab.value ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              safeTab === tab.value
                ? "bg-white text-olea-green shadow-sm"
                : "text-muted-foreground hover:bg-white/60",
            )}
            href={`/modules/kpi-dashboard?tab=${tab.value}`}
            key={tab.value}
          >
            <TabIcon value={tab.value} />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function TabIcon({ value }: { value: (typeof tabOptions)[number]["value"] }) {
  if (value === "settings") return <Settings className="mr-2 h-4 w-4" />;
  if (value === "board") return <BarChart3 className="mr-2 h-4 w-4" />;
  if (value === "milestones") {
    return <ClipboardList className="mr-2 h-4 w-4" />;
  }

  return null;
}

function KpiTabContent({ data }: { data: KpiDashboardData }) {
  return (
    <>
      <TabsContent value="setup">
        <SetupTab data={data} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsTab data={data} />
      </TabsContent>
      {quarterValues.map((quarter) => (
        <TabsContent key={quarter} value={`q${quarter}`}>
          <QuarterTrackerTab data={data} quarter={quarter} />
        </TabsContent>
      ))}
      <TabsContent value="board">
        <BoardDashboardTab data={data} />
      </TabsContent>
      <TabsContent value="milestones">
        <MilestonesAndRisksTab data={data} />
      </TabsContent>
      <TabsContent value="annual">
        <AnnualSummaryTab data={data} />
      </TabsContent>
    </>
  );
}
