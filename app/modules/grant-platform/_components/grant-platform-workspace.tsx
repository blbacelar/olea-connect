"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CircleCheckBig,
  FileText,
  LayoutGrid,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

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
    case "dashboard":
      return FileText;
    case "pipeline":
      return Users;
    case "coaching":
      return BookOpen;
    case "reports":
      return BarChart3;
    default:
      return Settings2;
  }
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
            {[
              { label: "Active grants", value: "12", icon: FileText },
              { label: "Upcoming deadlines", value: "5", icon: CalendarClock },
              { label: "Collaboration threads", value: "18", icon: Users },
              { label: "Board-ready reports", value: "4", icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="shadow-soft">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="grid size-10 place-items-center rounded-xl bg-olea-light text-olea-green">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                      <p className="text-sm text-slate-500">{item.label}</p>
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
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Current funding priorities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.sections.slice(0, 3).map((section) => (
                  <div key={section.id} className="rounded-lg border bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{section.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                  </div>
                ))}
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
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Reporting cadence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Track quarterly performance, funder updates, and internal milestones in one place.</p>
                <p className="rounded-lg border bg-slate-50 p-3">Board-ready snapshots are prepared from the same source of truth used by the pipeline.</p>
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
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Next review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Schedule the next review cycle around upcoming grant deadlines and board milestones.</p>
                <p className="rounded-lg border bg-slate-50 p-3">This keeps the program team aligned with the same standards used across the platform.</p>
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
                <p>Define the organization context, service area, and collaboration rules that shape the grant workflow.</p>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Included details</p>
                  <ul className="mt-2 space-y-2">
                    <li className="flex items-start gap-2">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>Organization-specific settings for grant operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>Ownership and partner management for submission readiness</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>Review and reporting workflows aligned to leadership needs</span>
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
