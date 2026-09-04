"use client";

import { Download, FileText, LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  FieldPath,
  TemplateExportFormat,
  TemplateExportRecord,
  TemplateFormData,
  TemplateSection,
  TemplateValue,
  WorkspaceMemberOption,
} from "@/lib/template-renderer/types";
import type { BrandProfile } from "@/lib/types";

import {
  BoardPackageAuditLogPanel,
  BoardPackagesPanel,
} from "./BoardCalendarPackagesPanel";
import {
  AgmTimelinePanel,
  BoardCalendarSetupPanel,
  DirectoryTablePanel,
  StaffTaskListPanel,
} from "./BoardCalendarWorkflowPanels";
import { MeetingsTablePanel } from "./board-calendar/DashboardPanels";
import { CalendarTab, DashboardTab } from "./board-calendar/WorkbenchTabs";
import { useBoardCalendarWorkbench } from "./board-calendar/use-board-calendar-workbench";
import {
  moduleTabs,
  type BoardCalendarModuleTab,
} from "./board-calendar/workbench-options";

export function BoardCalendarWorkbench({
  brand,
  data,
  templateInstanceId,
  organizationName,
  workspaceMembers,
  generateExport,
  createDownloadUrl,
  onChange,
  onDataChange,
}: BoardCalendarWorkbenchProps) {
  const workbench = useBoardCalendarWorkbench({
    data,
    templateInstanceId,
    organizationName,
    generateExport,
    createDownloadUrl,
    onDataChange,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-gradient-to-br from-white to-olea-light/60 p-4 shadow-sm sm:p-5">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={workbench.openMeetingComposer}
          >
            <Plus className="size-4" />
            Add meeting
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={workbench.isExportingPdf}
            onClick={() => void workbench.exportPdf()}
          >
            {workbench.isExportingPdf ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {templateInstanceId ? "Export PDF" : "Print / save PDF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!workbench.hasDatedEvents}
            onClick={workbench.addToCalendarFile}
          >
            <Download className="size-4" />
            Add to calendar
          </Button>
        </div>
        {workbench.exportError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {workbench.exportError}
          </p>
        ) : null}
      </div>

      <Tabs
        value={workbench.activeTab}
        onValueChange={(value) =>
          workbench.setActiveTab(value as BoardCalendarModuleTab)
        }
      >
        <div className="rounded-xl border bg-white px-3 py-3 shadow-sm sm:px-5">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max justify-start gap-1 bg-olea-light/70 p-1">
              {moduleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-2 px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-olea-dark"
                  >
                    <Icon className="size-4" />
                    {tab.label}
                    {tab.value === "meetings" &&
                    workbench.upcomingMeetingEvents.length ? (
                      <span className="rounded-full bg-olea-orange px-2 py-0.5 text-[11px] font-bold text-white">
                        {workbench.upcomingMeetingEvents.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <TabsContent value="dashboard" className="mt-0 space-y-5">
            <DashboardTab
              boardMeetings={workbench.boardMeetings}
              eventCount={workbench.events.length}
              nextEventDate={workbench.nextEvent?.dateKey ?? "Not scheduled"}
              nextEventTitle={
                workbench.nextEvent?.title ?? "Add a date from the calendar"
              }
              upcomingEvents={workbench.upcomingEvents}
              onEditEvent={workbench.editCalendarEntry}
              onViewCalendar={() => workbench.setActiveTab("calendar")}
            />
          </TabsContent>
          <TabsContent value="calendar" className="mt-0 space-y-5">
            <CalendarTab workbench={workbench} />
          </TabsContent>
          <TabsContent value="meetings" className="mt-0">
            <MeetingsTablePanel
              meetings={workbench.meetingEvents}
              upcomingMeetingCount={workbench.upcomingMeetingEvents.length}
              onEditEvent={workbench.editCalendarEntry}
            />
          </TabsContent>
          <SecondaryTabs
            brand={brand}
            data={data}
            templateInstanceId={templateInstanceId}
            workspaceMembers={workspaceMembers}
            onChange={onChange}
            onDataChange={onDataChange}
          />
        </div>
      </Tabs>
    </div>
  );
}

function SecondaryTabs({
  brand,
  data,
  templateInstanceId,
  workspaceMembers,
  onChange,
  onDataChange,
}: Pick<
  BoardCalendarWorkbenchProps,
  | "brand"
  | "data"
  | "templateInstanceId"
  | "workspaceMembers"
  | "onChange"
  | "onDataChange"
>) {
  return (
    <>
      <TabsContent value="workflows" className="mt-0 space-y-5">
        <StaffTaskListPanel data={data} onChange={onChange} />
      </TabsContent>
      <TabsContent value="packages" className="mt-0">
        <BoardPackagesPanel
          brand={brand}
          data={data}
          onDataChange={onDataChange}
          templateInstanceId={templateInstanceId ?? ""}
        />
      </TabsContent>
      <TabsContent value="directory" className="mt-0">
        <DirectoryTablePanel
          data={data}
          workspaceMembers={workspaceMembers}
          onDataChange={onDataChange}
        />
      </TabsContent>
      <TabsContent value="audit_log" className="mt-0">
        <BoardPackageAuditLogPanel data={data} />
      </TabsContent>
      <TabsContent value="settings" className="mt-0 space-y-5">
        <BoardCalendarSetupPanel
          data={data}
          workspaceMembers={workspaceMembers}
          onChange={onChange}
          onDataChange={onDataChange}
        />
        <AgmTimelinePanel data={data} onChange={onChange} />
      </TabsContent>
    </>
  );
}

interface BoardCalendarWorkbenchProps {
  brand: BrandProfile;
  data: TemplateFormData;
  errorsByPath: Map<string, string>;
  templateInstanceId?: string;
  organizationName: string;
  sections: TemplateSection[];
  workspaceMembers: WorkspaceMemberOption[];
  generateExport: (input: {
    templateInstanceId: string;
    format: TemplateExportFormat;
  }) => Promise<TemplateExportRecord>;
  createDownloadUrl: (exportId: string) => Promise<string>;
  onChange: (path: FieldPath, value: TemplateValue) => void;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
}
