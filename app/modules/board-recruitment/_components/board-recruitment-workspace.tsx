"use client";

import * as React from "react";
import {
  BarChart3,
  ClipboardList,
  Mail,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  RecruitmentData,
  RecruitmentTab,
} from "@/lib/board-recruitment/types";
import { Committees } from "./committees";
import { Matrix } from "./matrix";
import { Overview } from "./overview";
import { Report } from "./report";
import { Survey } from "./survey";
import { Terms } from "./terms";

const tabs: Array<{
  value: RecruitmentTab;
  label: string;
  icon: React.ElementType;
}> = [
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "survey", label: "Survey & Send", icon: Mail },
  { value: "matrix", label: "Skills Matrix", icon: ClipboardList },
  { value: "terms", label: "Board Terms", icon: Users },
  { value: "committees", label: "Committees", icon: ShieldCheck },
  { value: "report", label: "Board Report", icon: Printer },
];

export function BoardRecruitmentWorkspace({
  data,
  activeTab = "overview",
}: {
  data: RecruitmentData;
  activeTab?: RecruitmentTab;
}) {
  const [tab, setTab] = React.useState<RecruitmentTab>(activeTab);
  const navigate = (value: RecruitmentTab) => {
    setTab(value);
    window.history.replaceState(
      null,
      "",
      `/modules/board-recruitment?tab=${value}`,
    );
  };
  return (
    <div
      className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-8"
      style={{ ["--recruitment-accent" as string]: data.workspace.accentColor }}
    >
      <Card className="overflow-hidden">
        <div className="h-2 bg-olea-orange" />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
                Board Recruitment Toolkit
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                Board recruitment, made visible
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Maintain one shared roster, collect director skills, identify
                gaps, and prepare a board-ready recruitment report.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Tabs
        value={tab}
        onValueChange={(value) => navigate(value as RecruitmentTab)}
        className="space-y-6"
      >
        <div className="overflow-x-auto rounded-xl border bg-white p-2 shadow-soft">
          <TabsList className="h-auto min-w-max gap-1 bg-slate-50">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="min-h-11 gap-2">
                <Icon className="size-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview">
          <Overview data={data} onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="survey">
          <Survey data={data} />
        </TabsContent>
        <TabsContent value="matrix">
          <Matrix data={data} />
        </TabsContent>
        <TabsContent value="terms">
          <Terms data={data} />
        </TabsContent>
        <TabsContent value="committees">
          <Committees data={data} />
        </TabsContent>
        <TabsContent value="report">
          <Report data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
