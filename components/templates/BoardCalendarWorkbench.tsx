"use client";

import { useState } from "react";
import { Download, FileText, LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { MobileSectionSelect } from "@/components/ui/mobile-section-select";
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
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { BoardPackageMeeting } from "@/lib/template-renderer/board-calendar-packages";

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
import { MeetingDocumentsDialog } from "./board-calendar/MeetingDocumentsDialog";
import { BoardCalendarDateNotifications } from "./board-calendar/BoardCalendarDateNotifications";
import { BoardCalendarRsvpPanel } from "./board-calendar/BoardCalendarRsvpPanel";
import { BoardCalendarContactsPanel } from "./board-calendar/BoardCalendarContactsPanel";
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
  membershipRole,
  saveState,
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
  const [documentMeeting, setDocumentMeeting] = useState<BoardPackageMeeting | null>(null);
  const french = useLocaleContext().locale === "fr-CA";
  const readOnly = membershipRole === "member";
  const visibleTabs = readOnly
    ? moduleTabs.filter((tab) => ["dashboard", "calendar", "meetings", "packages"].includes(tab.value))
    : moduleTabs;
  const activeTab = visibleTabs.some((tab) => tab.value === workbench.activeTab)
    ? workbench.activeTab : "dashboard";
  const tabLabels: Record<BoardCalendarModuleTab, string> = {
    dashboard: french ? "Tableau de bord" : "Dashboard", calendar: french ? "Calendrier" : "Calendar",
    meetings: french ? "Réunions" : "Meetings", workflows: french ? "Tâches" : "Workflows",
    packages: french ? "Dossiers du conseil" : "Board Packages", directory: french ? "Répertoire" : "Directory",
    audit_log: french ? "Journal d’audit" : "Audit Log",
    settings: french ? "Paramètres" : "Settings", branding: french ? "Identité visuelle" : "Branding",
  };
  const localizedTabs = visibleTabs.map((tab) => ({ ...tab, label: tabLabels[tab.value] }));

  function openMeetingDocuments(event: { id: string }) {
    const index = Number(event.id.match(/^meeting-(\d+)$/)?.[1]);
    if (!Number.isInteger(index)) return;
    setDocumentMeeting(buildBoardPackageMeetings(data)[index] ?? null);
  }

  function downloadBackup() {
    const content = JSON.stringify({
      format: "olea-board-calendar-v1",
      organization: organizationName,
      exportedAt: new Date().toISOString(),
      calendar: data,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "board"}-calendar-backup.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-gradient-to-br from-white to-olea-light/60 p-4 shadow-sm sm:p-5">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {!readOnly ? <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={workbench.openMeetingComposer}
          >
            <Plus className="size-4" />
            {french ? "Ajouter une entrée" : "Add calendar entry"}
          </Button> : null}
          {!readOnly ? <Button
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
            {templateInstanceId ? (french ? "Exporter en PDF" : "Export PDF") : (french ? "Imprimer ou enregistrer en PDF" : "Print / save PDF")}
          </Button> : null}
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!workbench.hasDatedEvents}
            onClick={workbench.addToCalendarFile}
          >
            <Download className="size-4" />
            {french ? "Exporter le calendrier (.ics)" : "Export calendar (.ics)"}
          </Button>
          {membershipRole !== "member" ? <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={downloadBackup}>
            <Download className="size-4" />{french ? "Télécharger une sauvegarde JSON" : "Download JSON backup"}
          </Button> : null}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {workbench.hasDatedEvents
            ? (french
              ? "Téléchargez le fichier pour l’importer dans Google Agenda ou Outlook."
              : "Download the file to import it into Google Calendar or Outlook.")
            : (french
              ? "Ajoutez une entrée datée pour pouvoir exporter le calendrier."
              : "Add a dated entry to export the calendar.")}
        </p>
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
        value={activeTab}
        onValueChange={(value) =>
          workbench.setActiveTab(value as BoardCalendarModuleTab)
        }
      >
        <div className="rounded-xl border bg-white px-3 py-3 shadow-sm sm:px-5">
          <MobileSectionSelect
            label="Board Calendar section"
            options={localizedTabs}
            value={activeTab}
            onValueChange={(value) => workbench.setActiveTab(value as BoardCalendarModuleTab)}
          />
          <div className="hidden overflow-x-auto pb-1 md:block">
            <TabsList className="h-auto min-w-max justify-start gap-1 bg-olea-light/70 p-1">
              {localizedTabs.map((tab) => {
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
              french={french}
            />
          </TabsContent>
          <TabsContent value="calendar" className="mt-0 space-y-5">
            <CalendarTab workbench={workbench} readOnly={readOnly} />
          </TabsContent>
          <TabsContent value="meetings" className="mt-0">
            <MeetingsTablePanel
              canEdit={!readOnly}
              meetings={workbench.meetingEvents}
              upcomingMeetingCount={workbench.upcomingMeetingEvents.length}
              onEditEvent={workbench.editCalendarEntry}
              onOpenDocuments={openMeetingDocuments}
            />
          </TabsContent>
          <SecondaryTabs
            brand={brand}
            data={data}
            templateInstanceId={templateInstanceId}
            workspaceMembers={workspaceMembers}
            membershipRole={membershipRole}
            saveState={saveState}
            onChange={onChange}
            onDataChange={onDataChange}
          />
        </div>
      </Tabs>
      <div className="space-y-4">
        <BoardCalendarDateNotifications
          data={data}
          templateInstanceId={templateInstanceId}
          canSend={membershipRole !== "member"}
          saveState={saveState}
        />
        <BoardCalendarRsvpPanel data={data} templateInstanceId={templateInstanceId} saveState={saveState} />
      </div>
      {documentMeeting ? (
        <MeetingDocumentsDialog
          key={documentMeeting.id}
          canApprove={membershipRole !== "member"}
          data={data}
          meeting={documentMeeting}
          members={workspaceMembers}
          onClose={() => setDocumentMeeting(null)}
          onDataChange={onDataChange}
          saveState={saveState}
          templateInstanceId={templateInstanceId}
        />
      ) : null}
    </div>
  );
}

function SecondaryTabs({
  brand,
  data,
  templateInstanceId,
  workspaceMembers,
  membershipRole,
  saveState,
  onChange,
  onDataChange,
}: Pick<
  BoardCalendarWorkbenchProps,
  | "brand"
  | "data"
  | "templateInstanceId"
  | "workspaceMembers"
  | "membershipRole"
  | "saveState"
  | "onChange"
  | "onDataChange"
>) {
  const french = useLocaleContext().locale === "fr-CA";
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
          workspaceMembers={workspaceMembers}
          canSend={membershipRole !== "member"}
          canManage={membershipRole !== "member"}
          saveState={saveState}
        />
      </TabsContent>
      <TabsContent value="directory" className="mt-0">
        <div className="space-y-5"><BoardCalendarContactsPanel data={data} canManage={membershipRole !== "member"} onDataChange={onDataChange} />
          <DirectoryTablePanel data={data} workspaceMembers={workspaceMembers} onDataChange={onDataChange} />
        </div>
      </TabsContent>
      <TabsContent value="audit_log" className="mt-0">
        <BoardPackageAuditLogPanel data={data} templateInstanceId={templateInstanceId ?? ""} />
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
      <TabsContent value="branding" className="mt-0">
        <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{french ? "Identité visuelle du conseil" : "Board branding"}</h3>
          <p className="text-sm text-slate-600">{french
            ? "Les rapports et documents PDF utilisent le logo et les couleurs actuels de votre organisme. Modifiez-les dans les paramètres de marque."
            : "Reports and PDF documents use your organization’s current logo and colors. Edit them in brand settings."}</p>
          <div className="flex items-center gap-3"><span className="size-6 rounded border" style={{ backgroundColor: brand.primaryColor }} aria-label={french ? "Couleur principale" : "Primary color"} /><span className="size-6 rounded border" style={{ backgroundColor: brand.secondaryColor }} aria-label={french ? "Couleur secondaire" : "Secondary color"} /><strong>{brand.organizationName}</strong></div>
          <Button asChild variant="outline"><Link href="/settings/brand">{french ? "Modifier la marque" : "Edit brand"}</Link></Button>
        </section>
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
  membershipRole: "owner" | "admin" | "member";
  saveState: "saved" | "saving" | "unsaved" | "error";
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
