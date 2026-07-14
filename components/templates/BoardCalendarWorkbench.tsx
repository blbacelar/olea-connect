"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  PackageOpen,
  Pencil,
  Plus,
  ScrollText,
  Settings,
  Trash2,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  appendBoardCalendarEntry,
  deleteBoardCalendarEntry,
  getBoardCalendarEntryInput,
  syncBoardCalendarGeneratedTasks,
  type BoardCalendarEntryType,
  updateBoardCalendarEntry,
  upsertBoardCalendarCategoryColor,
} from "@/lib/template-renderer/board-calendar-editor";
import {
  addDays,
  boardCalendarCategoryColorDefaults,
  buildCalendarEvents,
  buildCategoryColors,
  buildMonthGrid,
  getTemplateMonthIndex,
  getTemplateYear,
  getWeekDays,
  groupEventsByDate,
  monthNames,
  toDateKey,
  weekdayNames,
  type CalendarViewEvent,
} from "@/lib/template-renderer/calendar-view";
import type {
  FieldPath,
  TemplateExportFormat,
  TemplateExportRecord,
  TemplateFormData,
  TemplateSection,
  TemplateValue,
} from "@/lib/template-renderer/types";
import type { BrandProfile } from "@/lib/types";
import { setValue } from "@/lib/template-renderer/schema";
import { cn } from "@/lib/utils";

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

type CalendarMode = "month" | "week" | "year";
type BoardCalendarModuleTab =
  | "dashboard"
  | "calendar"
  | "meetings"
  | "workflows"
  | "packages"
  | "directory"
  | "audit_log"
  | "settings";

const viewOptions: Array<{ label: string; value: CalendarMode }> = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Annual", value: "year" },
];

const moduleTabs: Array<{
  icon: typeof CalendarDays;
  label: string;
  value: BoardCalendarModuleTab;
}> = [
  { icon: LayoutDashboard, label: "Dashboard", value: "dashboard" },
  { icon: CalendarDays, label: "Calendar", value: "calendar" },
  { icon: FileText, label: "Meetings", value: "meetings" },
  { icon: Workflow, label: "Workflows", value: "workflows" },
  { icon: PackageOpen, label: "Board Packages", value: "packages" },
  { icon: Users, label: "Directory", value: "directory" },
  { icon: ScrollText, label: "Audit Log", value: "audit_log" },
  { icon: Settings, label: "Settings", value: "settings" },
];

const boardCalendarActiveTabStorageKey = "olea:board-calendar:active-tab";

const entryTypes: Array<{
  label: string;
  value: BoardCalendarEntryType;
}> = [
  { label: "Meeting or event", value: "meeting" },
  { label: "Annual calendar note", value: "annual_highlight" },
  { label: "Operational task", value: "staff_task" },
  { label: "AGM milestone", value: "agm_milestone" },
];

const confirmedOptions = ["Yes", "TBC", "No"];
const statusOptions = ["Not Started", "In Progress", "Complete"];
const meetingCategoryOptions = [
  "Board Meeting",
  "Committee Meeting",
  "AGM / Annual Meeting",
  "Key Deadline",
  "Other / General",
];
const annualHighlightCategoryOptions = [
  "Key Deadline",
  "Board Meeting",
  "Committee Meeting",
  "AGM / Annual Meeting",
  "Other / General",
];
const agmTrackOptions = [
  "Governance",
  "Event",
  "Finance",
  "Compliance",
  "Other / General",
];

function isBoardCalendarModuleTab(value: string): value is BoardCalendarModuleTab {
  return moduleTabs.some((tab) => tab.value === value);
}

function getBoardCalendarActiveTabStorageKey() {
  return `${boardCalendarActiveTabStorageKey}:${window.location.pathname}`;
}

export function BoardCalendarWorkbench({
  brand,
  data,
  errorsByPath,
  templateInstanceId,
  organizationName,
  sections,
  generateExport,
  createDownloadUrl,
  onChange,
  onDataChange,
}: {
  brand: BrandProfile;
  data: TemplateFormData;
  errorsByPath: Map<string, string>;
  templateInstanceId?: string;
  organizationName: string;
  sections: TemplateSection[];
  generateExport: (input: {
    templateInstanceId: string;
    format: TemplateExportFormat;
  }) => Promise<TemplateExportRecord>;
  createDownloadUrl: (exportId: string) => Promise<string>;
  onChange: (path: FieldPath, value: TemplateValue) => void;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
}) {
  const syncedData = useMemo(() => syncBoardCalendarGeneratedTasks(data), [data]);
  const events = useMemo(() => buildCalendarEvents(syncedData), [syncedData]);
  const categoryColors = useMemo(() => buildCategoryColors(syncedData), [syncedData]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const configuredYear = getTemplateYear(data);
  const configuredMonth = getTemplateMonthIndex(data);
  const todayKey = toDateKey(new Date());
  const todayDate = new Date();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [activeTab, setActiveTab] = useState<BoardCalendarModuleTab>("dashboard");
  const [anchorDate, setAnchorDate] = useState(todayDate);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [entryType, setEntryType] = useState<BoardCalendarEntryType>("meeting");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryCategory, setEntryCategory] = useState("");
  const [entryColor, setEntryColor] = useState(
    boardCalendarCategoryColorDefaults["Other / General"],
  );
  const [entryTime, setEntryTime] = useState("");
  const [entryLocation, setEntryLocation] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entryVirtualLink, setEntryVirtualLink] = useState("");
  const [entryLeadContact, setEntryLeadContact] = useState("");
  const [entryConfirmed, setEntryConfirmed] = useState("");
  const [entryRelatedMeeting, setEntryRelatedMeeting] = useState("");
  const [entryResponsible, setEntryResponsible] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [entryDone, setEntryDone] = useState(false);
  const [entryWeeksBefore, setEntryWeeksBefore] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");
  const hasMountedActiveTabPersistence = useRef(false);

  useEffect(() => {
    const storedTab = window.sessionStorage.getItem(
      getBoardCalendarActiveTabStorageKey(),
    );
    if (storedTab && isBoardCalendarModuleTab(storedTab)) {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    if (!hasMountedActiveTabPersistence.current) {
      hasMountedActiveTabPersistence.current = true;
      return;
    }

    window.sessionStorage.setItem(
      getBoardCalendarActiveTabStorageKey(),
      activeTab,
    );
  }, [activeTab]);

  const monthIndex = anchorDate.getMonth();
  const year = anchorDate.getFullYear();
  const isSelectedDateInPast = selectedDateKey < todayKey;
  const nextEvent =
    events.find((event) => event.dateKey && event.dateKey >= todayKey) ??
    events.find((event) => event.dateKey);
  const boardMeetings = events.filter(
    (event) => event.category === "Board Meeting",
  ).length;
  const meetingEvents = events.filter((event) => event.source === "meeting");
  const upcomingEvents = events
    .filter((event) => event.dateKey && event.dateKey >= todayKey)
    .slice(0, 5);
  const hasDatedEvents = events.some((event) => Boolean(event.dateKey));
  const categories = Array.from(
    events.reduce<Map<string, string>>((items, event) => {
      if (!items.has(event.category)) items.set(event.category, event.color);
      return items;
    }, new Map()),
  ).slice(0, 8);
  const selectedDateEvents = eventsByDate.get(selectedDateKey) ?? [];
  const editingEvent = editingEventId
    ? events.find((event) => event.id === editingEventId) ?? null
    : null;
  const selectedColorCategory =
    entryType === "staff_task" ? entryStatus || "Not Started" : entryCategory;
  const isEntryReady =
    Boolean(entryTitle.trim()) &&
    Boolean(selectedColorCategory.trim()) &&
    (Boolean(editingEventId) || !isSelectedDateInPast);

  function moveBackward() {
    setAnchorDate((current) => {
      if (mode === "year") return new Date(current.getFullYear() - 1, 0, 1);
      if (mode === "week") return addDays(current, -7);
      return new Date(current.getFullYear(), current.getMonth() - 1, 1);
    });
  }

  function moveForward() {
    setAnchorDate((current) => {
      if (mode === "year") return new Date(current.getFullYear() + 1, 0, 1);
      if (mode === "week") return addDays(current, 7);
      return new Date(current.getFullYear(), current.getMonth() + 1, 1);
    });
  }

  function goToConfiguredYear() {
    setAnchorDate(new Date(configuredYear, configuredMonth, 1));
  }

  function selectDate(dateKey: string) {
    const date = parseCalendarDateKey(dateKey);
    if (!date) return;

    setSelectedDateKey(dateKey);
    setActiveTab("calendar");
    setAnchorDate(date);
  }

  function updateEntryType(value: BoardCalendarEntryType) {
    setEntryType(value);
    setEntryCategory("");
    setEntryColor(boardCalendarCategoryColorDefaults["Other / General"]);
    setEntryTime("");
    setEntryLocation("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus(value === "staff_task" ? "Not Started" : "");
    setEntryDone(false);
    setEntryWeeksBefore("");
  }

  function addCalendarEntry() {
    if (!isEntryReady) return;
    if (!editingEventId && isSelectedDateInPast) return;

    const input = {
      type: entryType,
      dateKey: selectedDateKey,
      title: entryTitle,
      category: entryCategory,
      time: entryTime,
      location: entryLocation,
      virtualLink: entryVirtualLink,
      leadContact: entryLeadContact,
      confirmed: entryConfirmed,
      relatedMeeting: entryRelatedMeeting,
      responsible: entryResponsible,
      status:
        entryType === "staff_task" ? entryStatus || "Not Started" : entryStatus,
      done: entryDone,
      daysBeforeAgm: Number.parseInt(entryWeeksBefore, 10) || 0,
      notes: entryNotes,
    };
    onDataChange((currentData) => {
      const mutation = editingEventId
        ? updateBoardCalendarEntry(currentData, editingEventId, input)
        : appendBoardCalendarEntry(currentData, input);

      if (!mutation) return currentData;

      const nextData = setValue(currentData, mutation.path, mutation.value);
      const colorMutation = upsertBoardCalendarCategoryColor(
        nextData,
        getColorCategoryForInput(input),
        entryColor,
      );

      const nextDataWithColor = colorMutation
        ? setValue(nextData, colorMutation.path, colorMutation.value)
        : nextData;

      return input.type === "meeting"
        ? syncBoardCalendarGeneratedTasks(nextDataWithColor)
        : nextDataWithColor;
    });
    clearEntryForm();
  }

  function clearEntryForm() {
    setEditingEventId(null);
    setEntryCategory("");
    setEntryTitle("");
    setEntryColor(boardCalendarCategoryColorDefaults["Other / General"]);
    setEntryTime("");
    setEntryLocation("");
    setEntryNotes("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus("");
    setEntryDone(false);
    setEntryWeeksBefore("");
    setIsEntryModalOpen(false);
  }

  function editCalendarEntry(event: CalendarViewEvent) {
    const input = getBoardCalendarEntryInput(data, event.id);
    if (!input) return;

    setEditingEventId(event.id);
    setSelectedDateKey(input.dateKey || event.dateKey || selectedDateKey);
    setEntryType(input.type);
    setEntryCategory(input.category);
    setEntryColor(event.color);
    setEntryTitle(input.title);
    setEntryTime(input.time ?? "");
    setEntryLocation(input.location ?? "");
    setEntryNotes(input.notes ?? "");
    setEntryVirtualLink(input.virtualLink ?? "");
    setEntryLeadContact(input.leadContact ?? "");
    setEntryConfirmed(input.confirmed ?? "");
    setEntryRelatedMeeting(input.relatedMeeting ?? "");
    setEntryResponsible(input.responsible ?? "");
    setEntryStatus(
      input.type === "staff_task"
        ? input.status || "Not Started"
        : input.status ?? input.category ?? "",
    );
    setEntryDone(Boolean(input.done));
    setEntryWeeksBefore(
      input.daysBeforeAgm === undefined && input.weeksBefore === undefined
        ? ""
        : String(input.daysBeforeAgm ?? (input.weeksBefore ?? 0) * 7),
    );
    setActiveTab("calendar");
    setIsEntryModalOpen(true);
    const date = parseCalendarDateKey(input.dateKey);
    if (date) setAnchorDate(date);
  }

  function deleteCalendarEntry(eventId: string) {
    onDataChange((currentData) => {
      const mutation = deleteBoardCalendarEntry(currentData, eventId);
      if (!mutation) return currentData;

      const nextData = setValue(currentData, mutation.path, mutation.value);
      return eventId.startsWith("meeting-")
        ? syncBoardCalendarGeneratedTasks(nextData)
        : nextData;
    });
    clearEntryForm();
  }

  function openMeetingComposer() {
    const fallbackDateKey = selectedDateKey < todayKey ? todayKey : selectedDateKey;
    const fallbackDate = parseCalendarDateKey(fallbackDateKey);

    setActiveTab("calendar");
    setSelectedDateKey(fallbackDateKey);
    if (fallbackDate) setAnchorDate(fallbackDate);
    setEditingEventId(null);
    setEntryType("meeting");
    setEntryCategory("");
    setEntryColor(boardCalendarCategoryColorDefaults["Other / General"]);
    setEntryTitle("");
    setEntryTime("");
    setEntryLocation("");
    setEntryNotes("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus("");
    setEntryDone(false);
    setEntryWeeksBefore("");
    setIsEntryModalOpen(true);
  }

  async function exportPdf() {
    if (!templateInstanceId) {
      window.print();
      return;
    }

    setIsExportingPdf(true);
    try {
      const generated = await generateExport({
        templateInstanceId,
        format: "pdf",
      });
      const signedUrl = await createDownloadUrl(generated.id);
      window.location.assign(signedUrl);
      setExportError("");
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Unable to generate this PDF export.",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  function addToCalendarFile() {
    const datedEvents = events.filter(
      (event): event is CalendarViewEvent & { dateKey: string } =>
        Boolean(event.dateKey),
    );
    if (!datedEvents.length) return;

    const calendarLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Olea Connects//Board Calendar//EN",
      `X-WR-CALNAME:${escapeIcsText(organizationName)} Board Calendar`,
    ];

    datedEvents.forEach((event) => {
      const startsAt = formatIcsDate(event.dateKey, event.time);
      const endsAt = formatIcsDate(event.dateKey, event.time, 60);
      calendarLines.push(
        "BEGIN:VEVENT",
        `UID:${event.id}@olea-connects`,
        `DTSTART:${startsAt}`,
        `DTEND:${endsAt}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.notes ?? event.category)}`,
        "END:VEVENT",
      );
    });
    calendarLines.push("END:VCALENDAR");

    const blob = new Blob([calendarLines.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    const calendarUrl = URL.createObjectURL(blob);
    link.href = calendarUrl;
    link.download = `${organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "board-calendar"}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(calendarUrl), 0);
  }

  function getColorCategoryForInput(input: {
    category: string;
    status: string;
    type: BoardCalendarEntryType;
  }) {
    return input.type === "staff_task"
      ? input.status || "Not Started"
      : input.category;
  }

  function resolveEntryColor(category: string) {
    return (
      categoryColors.get(category) ??
      boardCalendarCategoryColorDefaults[category] ??
      boardCalendarCategoryColorDefaults["Other / General"]
    );
  }

  function updateEntryCategory(value: string) {
    setEntryCategory(value);
    setEntryColor(resolveEntryColor(value));
  }

  function updateEntryStatus(value: string) {
    setEntryStatus(value);
    if (entryType === "staff_task") {
      setEntryColor(resolveEntryColor(value));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-gradient-to-br from-white to-olea-light/60 p-4 shadow-sm sm:p-5">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={openMeetingComposer}
          >
            <Plus className="size-4" />
            Add meeting
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isExportingPdf}
            onClick={() => void exportPdf()}
          >
            {isExportingPdf ? (
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
            disabled={!hasDatedEvents}
            onClick={addToCalendarFile}
          >
            <Download className="size-4" />
            Add to calendar
          </Button>
        </div>
        {exportError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {exportError}
          </p>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as BoardCalendarModuleTab)}
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
                    {tab.value === "meetings" && meetingEvents.length ? (
                      <span className="rounded-full bg-olea-orange px-2 py-0.5 text-[11px] font-bold text-white">
                        {meetingEvents.length}
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
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard
                icon={CalendarDays}
                label="Calendar items"
                value={String(events.length)}
                detail="Meetings, deadlines, and AGM milestones"
              />
              <SummaryCard
                icon={Clock}
                label="Next dated item"
                value={nextEvent?.dateKey ?? "Not scheduled"}
                detail={nextEvent?.title ?? "Add a date from the calendar"}
              />
              <SummaryCard
                icon={ListChecks}
                label="Board meetings"
                value={String(boardMeetings)}
                detail="Generated from calendar entries"
              />
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Upcoming board work
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    A quick read on the next meetings, deadlines, and staff work.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("calendar")}
                >
                  View calendar
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {upcomingEvents.length ? (
                  upcomingEvents.map((event) => (
                    <CalendarEventPill
                      key={event.id}
                      event={event}
                      onEditEvent={() => editCalendarEntry(event)}
                    />
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No upcoming items yet. Use Add meeting to start the calendar.
                  </p>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0 space-y-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid w-full grid-cols-3 rounded-lg border bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
                {viewOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={mode === option.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMode(option.value)}
                    className="w-full sm:w-auto"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="grid w-full grid-cols-[auto_1fr_auto] rounded-lg border bg-white shadow-sm sm:inline-flex sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Previous calendar period"
                  onClick={moveBackward}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-w-0 px-2 text-sm sm:px-4"
                  onClick={goToConfiguredYear}
                >
                  {mode === "year" ? year : `${monthNames[monthIndex]} ${year}`}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Next calendar period"
                  onClick={moveForward}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {categories.length ? (
              <div className="flex flex-wrap gap-2 rounded-xl border bg-slate-50 p-3">
                {categories.map(([category, color]) => (
                  <Badge
                    key={category}
                    variant="outline"
                    className="gap-2 border-slate-200 bg-white text-slate-700"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {category}
                  </Badge>
                ))}
              </div>
            ) : null}

          {mode === "year" ? (
            <YearCalendar
              events={events}
              year={year}
              onEditEvent={editCalendarEntry}
            />
          ) : mode === "week" ? (
            <WeekCalendar
              anchorDate={anchorDate}
              eventsByDate={eventsByDate}
              onEditEvent={editCalendarEntry}
              onSelectDate={selectDate}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
            />
          ) : (
            <MonthCalendar
              eventsByDate={eventsByDate}
              monthIndex={monthIndex}
              onEditEvent={editCalendarEntry}
              onSelectDate={selectDate}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
              year={year}
            />
          )}

            <CalendarEntryComposer
              entryCategory={entryCategory}
              entryColor={entryColor}
              entryLocation={entryLocation}
              entryNotes={entryNotes}
              entryTime={entryTime}
              entryTitle={entryTitle}
              entryType={entryType}
              selectedDateEvents={selectedDateEvents}
              selectedDateKey={selectedDateKey}
              onAdd={addCalendarEntry}
              onCancelEdit={clearEntryForm}
              onEditEvent={editCalendarEntry}
              onEntryTypeChange={updateEntryType}
              onLocationChange={setEntryLocation}
              onNotesChange={setEntryNotes}
              onTimeChange={setEntryTime}
              onTitleChange={setEntryTitle}
              onVirtualLinkChange={setEntryVirtualLink}
              onWeeksBeforeChange={setEntryWeeksBefore}
              onLeadContactChange={setEntryLeadContact}
              onConfirmedChange={setEntryConfirmed}
              onRelatedMeetingChange={setEntryRelatedMeeting}
              onResponsibleChange={setEntryResponsible}
              onCategoryChange={updateEntryCategory}
              onColorChange={setEntryColor}
              onStatusChange={updateEntryStatus}
              onDoneChange={setEntryDone}
              onDeleteEntry={deleteCalendarEntry}
              onSelectedDateChange={selectDate}
              isEntryModalOpen={isEntryModalOpen}
              isSelectedDateInPast={isSelectedDateInPast}
              todayKey={todayKey}
              editingEventId={editingEventId}
              entryConfirmed={entryConfirmed}
              entryDone={entryDone}
              entryLeadContact={entryLeadContact}
              entryRelatedMeeting={entryRelatedMeeting}
              entryResponsible={entryResponsible}
              entryStatus={entryStatus}
              entryVirtualLink={entryVirtualLink}
              entryWeeksBefore={entryWeeksBefore}
              editingEvent={editingEvent}
            />
          </TabsContent>

          <TabsContent value="meetings" className="mt-0">
            <MeetingsTablePanel
              meetings={meetingEvents}
              onEditEvent={editCalendarEntry}
            />
          </TabsContent>

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
              onDataChange={onDataChange}
            />
          </TabsContent>

          <TabsContent value="audit_log" className="mt-0">
            <BoardPackageAuditLogPanel data={data} />
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-5">
            <BoardCalendarSetupPanel
              data={data}
              onChange={onChange}
              onDataChange={onDataChange}
            />
            <AgmTimelinePanel data={data} onChange={onChange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-olea-light p-2 text-olea-dark">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MeetingsTablePanel({
  meetings,
  onEditEvent,
}: {
  meetings: CalendarViewEvent[];
  onEditEvent: (event: CalendarViewEvent) => void;
}) {
  return (
    <section
      className="rounded-xl border bg-white p-5 shadow-sm"
      aria-labelledby="board-calendar-meetings-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="board-calendar-meetings-heading"
            className="text-xl font-semibold text-slate-950"
          >
            Meetings
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Only entries created as Meeting or Event appear here.
          </p>
        </div>
        <Badge variant="outline">{meetings.length} total</Badge>
      </div>

      {meetings.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1fr_auto] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:grid">
            <span>Meeting</span>
            <span>Date</span>
            <span>Time</span>
            <span>Location</span>
            <span>Lead contact</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1fr_auto] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950">{meeting.title}</p>
                  <p className="text-xs text-slate-500">{meeting.category}</p>
                </div>
                <MeetingTableField label="Date" value={meeting.dateKey ?? "No date"} />
                <MeetingTableField label="Time" value={meeting.time || "No time"} />
                <MeetingTableField
                  label="Location"
                  value={meeting.location || "No location"}
                />
                <MeetingTableField
                  label="Lead contact"
                  value={meeting.leadContact || "No lead contact"}
                />
                <div className="lg:text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Edit meeting ${meeting.title}`}
                    onClick={() => onEditEvent(meeting)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No meetings yet. Use Add meeting to create the first meeting or event.
        </p>
      )}
    </section>
  );
}

function MeetingTableField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
        {label}
      </p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}

function MonthCalendar({
  eventsByDate,
  monthIndex,
  selectedDateKey,
  todayKey,
  year,
  onEditEvent,
  onSelectDate,
}: {
  eventsByDate: Map<string, CalendarViewEvent[]>;
  monthIndex: number;
  selectedDateKey: string;
  todayKey: string;
  year: number;
  onEditEvent: (event: CalendarViewEvent) => void;
  onSelectDate: (dateKey: string) => void;
}) {
  const days = buildMonthGrid(year, monthIndex);

  return (
    <div
      className="overflow-hidden rounded-xl border bg-white"
      data-testid="board-calendar-month-grid"
    >
      <CalendarWeekHeader />
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.dateKey}
            dateKey={day.dateKey}
            dayNumber={day.date.getDate()}
            disabled={day.dateKey < todayKey}
            events={eventsByDate.get(day.dateKey) ?? []}
            muted={!day.isCurrentMonth}
            selected={day.dateKey === selectedDateKey}
            onEditEvent={onEditEvent}
            onSelect={() => onSelectDate(day.dateKey)}
          />
        ))}
      </div>
    </div>
  );
}

function WeekCalendar({
  anchorDate,
  eventsByDate,
  selectedDateKey,
  todayKey,
  onEditEvent,
  onSelectDate,
}: {
  anchorDate: Date;
  eventsByDate: Map<string, CalendarViewEvent[]>;
  selectedDateKey: string;
  todayKey: string;
  onEditEvent: (event: CalendarViewEvent) => void;
  onSelectDate: (dateKey: string) => void;
}) {
  const weekDays = getWeekDays(anchorDate);

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {weekDays.map((day) => {
        const dateKey = toDateKey(day);
        const events = eventsByDate.get(dateKey) ?? [];
        const disabled = dateKey < todayKey;
        return (
          <div
            key={dateKey}
            aria-disabled={disabled}
            className={cn(
              "rounded-xl border bg-white p-3 text-left transition",
              disabled &&
                "border-slate-200 bg-slate-100 text-slate-400 opacity-70",
              selectedDateKey === dateKey && "border-olea-green ring-2 ring-olea-green/20",
            )}
          >
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "w-full rounded-lg text-left transition hover:text-olea-green disabled:cursor-not-allowed disabled:hover:text-inherit",
              )}
              onClick={() => onSelectDate(dateKey)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                {weekdayNames[day.getDay()]}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {monthNames[day.getMonth()].slice(0, 3)} {day.getDate()}
              </p>
            </button>
            <div className="mt-3 space-y-2">
              {events.length ? (
                events.map((event) => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    onEditEvent={() => onEditEvent(event)}
                  />
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                  No scheduled items
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearCalendar({
  events,
  year,
  onEditEvent,
}: {
  events: CalendarViewEvent[];
  year: number;
  onEditEvent: (event: CalendarViewEvent) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {monthNames.map((month, monthIndex) => {
        const monthEvents = events.filter((event) => {
          if (event.date) {
            return (
              event.date.getFullYear() === year &&
              event.date.getMonth() === monthIndex
            );
          }
          return event.monthIndex === monthIndex;
        });

        return (
          <div key={month} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <h3 className="font-semibold text-slate-950">{month}</h3>
              <Badge variant="outline">{monthEvents.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {monthEvents.length ? (
                monthEvents.slice(0, 5).map((event) => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    compact
                    onEditEvent={() => onEditEvent(event)}
                  />
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                  No scheduled items yet
                </p>
              )}
              {monthEvents.length > 5 ? (
                <p className="text-xs font-medium text-slate-500">
                  +{monthEvents.length - 5} more
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarWeekHeader() {
  return (
    <div className="grid grid-cols-7 border-b bg-olea-dark text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-white sm:text-xs">
      {weekdayNames.map((day) => (
        <div
          key={day}
          className="border-r border-white/10 px-1 py-2 last:border-r-0 sm:px-2 sm:py-3"
        >
          <span className="sm:hidden">{day.slice(0, 1)}</span>
          <span className="hidden sm:inline">{day.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

function DayCell({
  dateKey,
  dayNumber,
  disabled,
  events,
  muted,
  selected,
  onEditEvent,
  onSelect,
}: {
  dateKey: string;
  dayNumber: number;
  disabled: boolean;
  events: CalendarViewEvent[];
  muted: boolean;
  selected: boolean;
  onEditEvent: (event: CalendarViewEvent) => void;
  onSelect: () => void;
}) {
  return (
    <div
      aria-disabled={disabled}
      className={cn(
        "min-h-[74px] border-b border-r bg-white p-1.5 text-left transition last:border-r-0 sm:min-h-[96px] sm:p-2 md:min-h-[150px] md:p-3 [&:nth-child(7n)]:border-r-0",
        muted && "bg-slate-50 text-slate-400",
        disabled &&
          "bg-slate-100 text-slate-400 opacity-70",
        selected && "relative z-10 border-olea-green ring-2 ring-inset ring-olea-green",
      )}
    >
      <button
        type="button"
        aria-label={disabled ? `${dateKey} unavailable` : `Select ${dateKey}`}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-1 rounded-lg text-left disabled:cursor-not-allowed sm:gap-2"
        onClick={onSelect}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-semibold sm:size-7 sm:text-sm",
            disabled
              ? "bg-slate-200 text-slate-400"
              : muted
                ? "text-slate-400"
                : "bg-olea-light text-olea-dark",
          )}
        >
          {dayNumber}
        </span>
        {events.length > 3 ? (
          <span className="text-[10px] font-medium text-slate-400 sm:text-xs">
            +{events.length - 3}
          </span>
        ) : null}
      </button>
      <div className="mt-1 flex flex-wrap gap-1 md:hidden">
        {events.slice(0, 4).map((event) => (
          <span
            key={event.id}
            aria-label={event.title}
            className="size-1.5 rounded-full sm:size-2"
            style={{ backgroundColor: event.color }}
          />
        ))}
        {events.length > 4 ? (
          <span className="text-[10px] font-semibold text-slate-500">
            +{events.length - 4}
          </span>
        ) : null}
      </div>
      <div className="mt-3 hidden space-y-1.5 md:block">
        {events.slice(0, 3).map((event) => (
          <CalendarEventPill
            key={event.id}
            event={event}
            compact
            onEditEvent={() => onEditEvent(event)}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarEntryComposer({
  editingEventId,
  entryCategory,
  entryColor,
  entryConfirmed,
  entryDone,
  entryLeadContact,
  entryLocation,
  entryNotes,
  entryRelatedMeeting,
  entryResponsible,
  entryStatus,
  entryTime,
  entryTitle,
  entryType,
  entryVirtualLink,
  entryWeeksBefore,
  editingEvent,
  selectedDateEvents,
  selectedDateKey,
  isEntryModalOpen,
  isSelectedDateInPast,
  todayKey,
  onAdd,
  onCategoryChange,
  onCancelEdit,
  onColorChange,
  onConfirmedChange,
  onDeleteEntry,
  onDoneChange,
  onEditEvent,
  onEntryTypeChange,
  onLeadContactChange,
  onLocationChange,
  onNotesChange,
  onRelatedMeetingChange,
  onResponsibleChange,
  onSelectedDateChange,
  onStatusChange,
  onTimeChange,
  onTitleChange,
  onVirtualLinkChange,
  onWeeksBeforeChange,
}: {
  editingEventId: string | null;
  entryCategory: string;
  entryColor: string;
  entryConfirmed: string;
  entryDone: boolean;
  entryLeadContact: string;
  entryLocation: string;
  entryNotes: string;
  entryRelatedMeeting: string;
  entryResponsible: string;
  entryStatus: string;
  entryTime: string;
  entryTitle: string;
  entryType: BoardCalendarEntryType;
  entryVirtualLink: string;
  entryWeeksBefore: string;
  editingEvent: CalendarViewEvent | null;
  selectedDateEvents: CalendarViewEvent[];
  selectedDateKey: string;
  isEntryModalOpen: boolean;
  isSelectedDateInPast: boolean;
  todayKey: string;
  onAdd: () => void;
  onCategoryChange: (value: string) => void;
  onCancelEdit: () => void;
  onColorChange: (value: string) => void;
  onConfirmedChange: (value: string) => void;
  onDeleteEntry: (eventId: string) => void;
  onDoneChange: (value: boolean) => void;
  onEditEvent: (event: CalendarViewEvent) => void;
  onEntryTypeChange: (value: BoardCalendarEntryType) => void;
  onLeadContactChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onRelatedMeetingChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
  onSelectedDateChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onVirtualLinkChange: (value: string) => void;
  onWeeksBeforeChange: (value: string) => void;
}) {
  const isMeeting = entryType === "meeting";
  const isAnnualHighlight = entryType === "annual_highlight";
  const isStaffTask = entryType === "staff_task";
  const isAgmMilestone = entryType === "agm_milestone";
  const categoryOptions = isAgmMilestone
    ? agmTrackOptions
    : isAnnualHighlight
      ? annualHighlightCategoryOptions
      : meetingCategoryOptions;
  const [entryPendingDelete, setEntryPendingDelete] =
    useState<CalendarViewEvent | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const wasEntryModalOpenRef = useRef(false);
  const onCancelEditRef = useRef(onCancelEdit);

  useEffect(() => {
    onCancelEditRef.current = onCancelEdit;
  }, [onCancelEdit]);

  useEffect(() => {
    if (isEntryModalOpen && !wasEntryModalOpenRef.current) {
      const frame = window.requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });

      wasEntryModalOpenRef.current = true;
      return () => window.cancelAnimationFrame(frame);
    }

    wasEntryModalOpenRef.current = isEntryModalOpen;
    return undefined;
  }, [isEntryModalOpen]);

  useEffect(() => {
    if (!isEntryModalOpen || entryPendingDelete) return;

    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") onCancelEditRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [entryPendingDelete, isEntryModalOpen]);

  const selectedColorCategory =
    entryType === "staff_task" ? entryStatus || "Not Started" : entryCategory;
  const isEntryReady =
    Boolean(entryTitle.trim()) &&
    Boolean(selectedColorCategory.trim()) &&
    (Boolean(editingEventId) || !isSelectedDateInPast);

  function confirmDeleteEntry() {
    if (!entryPendingDelete) return;

    onDeleteEntry(entryPendingDelete.id);
    setEntryPendingDelete(null);
  }

  return (
    <div className="rounded-xl border bg-slate-50 p-3 sm:p-4">
      <div
        className="rounded-xl bg-white p-3 shadow-sm sm:p-4"
        data-testid="board-calendar-selected-date-panel"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          Selected date
        </p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">
          {selectedDateKey}
        </h3>
        <div className="mt-4 space-y-2">
          {selectedDateEvents.length ? (
            selectedDateEvents.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "rounded-xl border bg-white p-2",
                  editingEventId === event.id && "border-olea-green ring-2 ring-olea-green/20",
                )}
              >
                <CalendarEventPill event={event} />
                <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 justify-start px-2 text-xs sm:justify-center"
                    onClick={() => onEditEvent(event)}
                  >
                    <Pencil className="size-3.5" />
                    Edit entry
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 justify-start px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800 sm:justify-center"
                    onClick={() => setEntryPendingDelete(event)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete entry
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-slate-500">
              Nothing scheduled yet. Add a meeting, note, task, or milestone for
              this date.
            </p>
          )}
        </div>
      </div>

      {isEntryModalOpen ? (
        <div
          aria-labelledby="calendar-entry-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-4"
          role="dialog"
        >
          <div
            className="my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6"
            data-testid="board-calendar-entry-form"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-olea-light p-2 text-olea-dark">
                  {editingEventId ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </div>
                <div>
                  <h3
                    id="calendar-entry-dialog-title"
                    className="font-semibold text-slate-950"
                  >
                    {editingEventId ? "Edit entry" : "Add Entry"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {editingEventId
                      ? "Update this calendar item without leaving the calendar."
                      : "This creates the matching workbook record automatically."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close entry form"
                onClick={onCancelEdit}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="calendar-entry-date">Entry date</Label>
            <Input
              id="calendar-entry-date"
              type="date"
              min={editingEventId ? undefined : todayKey}
              value={selectedDateKey}
              onChange={(event) => onSelectedDateChange(event.target.value)}
            />
            <p
              className={cn(
                "text-xs",
                !editingEventId && isSelectedDateInPast
                  ? "font-medium text-red-600"
                  : "text-slate-500",
              )}
            >
              {!editingEventId && isSelectedDateInPast
                ? "Choose today or a future date to add a new entry."
                : "New entries can be scheduled for today or a future date."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-entry-type">Entry type</Label>
            <Select
              disabled={Boolean(editingEventId)}
              value={entryType}
              onValueChange={(value) =>
                onEntryTypeChange(value as BoardCalendarEntryType)
              }
            >
              <SelectTrigger id="calendar-entry-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entryTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingEventId ? (
              <p className="text-xs text-slate-500">
                Entry type is fixed while editing so this updates the original record.
              </p>
            ) : null}
          </div>
          {!isStaffTask ? (
            <div className="space-y-2">
              <Label htmlFor="calendar-entry-category">
                {isAgmMilestone ? "Track" : "Category"}
              </Label>
              <Select
                value={entryCategory || undefined}
                onValueChange={onCategoryChange}
              >
                <SelectTrigger id="calendar-entry-category">
                  <SelectValue placeholder={isAgmMilestone ? "Choose track" : "Choose category"} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {isStaffTask || isAgmMilestone ? (
            <div className="space-y-2">
              <Label htmlFor="calendar-entry-status">Workflow status</Label>
              <Select
                value={entryStatus || undefined}
                onValueChange={onStatusChange}
              >
                <SelectTrigger id="calendar-entry-status">
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {selectedColorCategory ? (
            <div className="space-y-2">
              <Label htmlFor="calendar-entry-color">Calendar color</Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-white px-3 py-2">
                <Input
                  id="calendar-entry-color"
                  type="color"
                  value={entryColor}
                  onChange={(event) => onColorChange(event.target.value)}
                  className="h-7 w-10 cursor-pointer border-0 bg-transparent p-0"
                />
                <Input
                  aria-label="Calendar color hex code"
                  value={entryColor}
                  readOnly
                  className="h-7 border-0 px-0 font-mono uppercase shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-slate-500">
                This color is reused for matching calendar entries.
              </p>
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="calendar-entry-title">Title</Label>
            <Input
              ref={titleInputRef}
              id="calendar-entry-title"
              placeholder="Board meeting, budget review, AGM notice..."
              value={entryTitle}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </div>
          {isMeeting ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-time">Time</Label>
                <Input
                  id="calendar-entry-time"
                  type="time"
                  value={entryTime}
                  onChange={(event) => onTimeChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-location">Location / platform</Label>
                <Input
                  id="calendar-entry-location"
                  placeholder="Boardroom, Zoom, community hall"
                  value={entryLocation}
                  onChange={(event) => onLocationChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-virtual-link">Virtual link</Label>
                <Input
                  id="calendar-entry-virtual-link"
                  placeholder="https://zoom.us/j/..."
                  value={entryVirtualLink}
                  onChange={(event) => onVirtualLinkChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-lead-contact">Lead contact</Label>
                <Input
                  id="calendar-entry-lead-contact"
                  placeholder="Administrator, Treasurer, Board Chair"
                  value={entryLeadContact}
                  onChange={(event) => onLeadContactChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-confirmed">Confirmed?</Label>
                <Select
                  value={entryConfirmed || undefined}
                  onValueChange={onConfirmedChange}
                >
                  <SelectTrigger id="calendar-entry-confirmed">
                    <SelectValue placeholder="Choose confirmation" />
                  </SelectTrigger>
                  <SelectContent>
                    {confirmedOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          {isStaffTask ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-related-meeting">
                  Related meeting
                </Label>
                <Input
                  id="calendar-entry-related-meeting"
                  placeholder="Board budget review"
                  value={entryRelatedMeeting}
                  onChange={(event) => onRelatedMeetingChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-responsible">Responsible</Label>
                <Input
                  id="calendar-entry-responsible"
                  placeholder="Administrator"
                  value={entryResponsible}
                  onChange={(event) => onResponsibleChange(event.target.value)}
                />
              </div>
            </>
          ) : null}
          {isAgmMilestone ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-days-before-agm">
                  Days before AGM
                </Label>
                <Input
                  id="calendar-entry-days-before-agm"
                  type="number"
                  placeholder="30"
                  value={entryWeeksBefore}
                  onChange={(event) => onWeeksBeforeChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-entry-responsible">Responsible</Label>
                <Input
                  id="calendar-entry-responsible"
                  placeholder="Administrator"
                  value={entryResponsible}
                  onChange={(event) => onResponsibleChange(event.target.value)}
                />
              </div>
            </>
          ) : null}
          {isAnnualHighlight ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 md:col-span-2">
              Annual notes use the selected calendar date and automatically set
              the matching month in the workbook.
            </p>
          ) : null}
          {isStaffTask || isAgmMilestone ? (
            <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={entryDone}
                onChange={(event) => onDoneChange(event.target.checked)}
                className="size-4 accent-olea-green"
              />
              Done
            </label>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="calendar-entry-notes">Notes</Label>
            <Textarea
              id="calendar-entry-notes"
              placeholder="Add context, prep notes, owner details, or reminders."
              value={entryNotes}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!isEntryReady}
            onClick={onAdd}
          >
            {editingEventId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editingEventId ? "Update entry" : "Add entry"}
          </Button>
          {editingEventId ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              variant="outline"
              onClick={onCancelEdit}
            >
              <X className="size-4" />
              Cancel edit
            </Button>
          ) : null}
          {editingEventId ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              variant="destructive"
              onClick={() => setEntryPendingDelete(editingEvent)}
            >
              <Trash2 className="size-4" />
              Delete entry
            </Button>
          ) : null}
        </div>
          </div>
        </div>
      ) : null}
      <DeleteEntryDialog
        event={entryPendingDelete}
        onCancel={() => setEntryPendingDelete(null)}
        onConfirm={confirmDeleteEntry}
      />
    </div>
  );
}

function CalendarEventPill({
  event,
  compact = false,
  onEditEvent,
}: {
  event: CalendarViewEvent;
  compact?: boolean;
  onEditEvent?: () => void;
}) {
  const content = (
    <>
      <p className="font-semibold text-slate-900">{event.title}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
        {event.dateKey ? <span>{event.dateKey}</span> : null}
        {event.time ? <span>{event.time}</span> : null}
        {event.location && !compact ? <span>{event.location}</span> : null}
      </div>
      {event.relatedMeeting ? (
        <p className="truncate text-[11px] leading-4 text-slate-700">
          For: {event.relatedMeeting}
        </p>
      ) : null}
      {event.notes && !compact ? (
        <p className="text-[11px] leading-4 text-slate-600">{event.notes}</p>
      ) : null}
    </>
  );

  const className = cn(
    "rounded-lg border px-2.5 py-2 text-xs leading-5 shadow-sm",
    compact ? "space-y-0.5" : "space-y-1",
    onEditEvent && "w-full text-left transition hover:brightness-95",
  );
  const style = {
    backgroundColor: `${event.color}14`,
    borderColor: `${event.color}55`,
    color: event.color,
  };

  if (onEditEvent) {
    return (
      <button
        type="button"
        aria-label={`Edit ${event.title}`}
        className={className}
        style={style}
        onClick={onEditEvent}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}

function DeleteEntryDialog({
  event,
  onCancel,
  onConfirm,
}: {
  event: CalendarViewEvent | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!event) return;

    cancelButtonRef.current?.focus();

    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [event, onCancel]);

  if (!event) return null;

  return (
    <div
      aria-labelledby="delete-calendar-entry-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-50 p-2 text-red-700">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h3
              id="delete-calendar-entry-title"
              className="text-lg font-semibold text-slate-950"
            >
              Delete this calendar entry?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This will remove “{event.title}” from this workbook calendar. This
              action cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete entry
          </Button>
        </div>
      </div>
    </div>
  );
}

function parseCalendarDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(dateKey: string, time?: string, minutesToAdd = 0) {
  const date = parseCalendarDateKey(dateKey) ?? new Date();
  const timeMatch = time?.match(/^(\d{1,2}):(\d{2})$/);
  const hours = timeMatch ? Number(timeMatch[1]) : 9;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;
  const eventDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes + minutesToAdd,
  );

  return [
    eventDate.getFullYear(),
    String(eventDate.getMonth() + 1).padStart(2, "0"),
    String(eventDate.getDate()).padStart(2, "0"),
    "T",
    String(eventDate.getHours()).padStart(2, "0"),
    String(eventDate.getMinutes()).padStart(2, "0"),
    "00",
  ].join("");
}
