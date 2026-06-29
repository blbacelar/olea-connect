"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  appendBoardCalendarEntry,
  deleteBoardCalendarEntry,
  getBoardCalendarEntryInput,
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
  TemplateFormData,
  TemplateSection,
  TemplateValue,
} from "@/lib/template-renderer/types";
import { setValue } from "@/lib/template-renderer/schema";
import { cn } from "@/lib/utils";

import { TemplateFields } from "./TemplateFields";

type CalendarMode = "month" | "week" | "year";
type WorkspaceMode =
  | "calendar"
  | "getting_started"
  | "committees"
  | "meeting_schedule"
  | "operational_calendar"
  | "annual_calendar"
  | "monthly_calendar"
  | "staff_tasks"
  | "agm_timeline";

const viewOptions: Array<{ label: string; value: CalendarMode }> = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Annual", value: "year" },
];

const workspaceOptions: Array<{ label: string; value: WorkspaceMode }> = [
  { label: "Calendar workspace", value: "calendar" },
  { label: "Getting started", value: "getting_started" },
  { label: "Committees", value: "committees" },
  { label: "Meeting schedule", value: "meeting_schedule" },
  { label: "Operational workflow", value: "operational_calendar" },
  { label: "Annual calendar", value: "annual_calendar" },
  { label: "Monthly calendar", value: "monthly_calendar" },
  { label: "Governance task list", value: "staff_tasks" },
  { label: "AGM planning timeline", value: "agm_timeline" },
];

const entryTypes: Array<{
  defaultCategory: string;
  label: string;
  value: BoardCalendarEntryType;
}> = [
  { label: "Meeting or event", value: "meeting", defaultCategory: "Board Meeting" },
  {
    label: "Annual calendar note",
    value: "annual_highlight",
    defaultCategory: "Key Deadline",
  },
  { label: "Operational task", value: "staff_task", defaultCategory: "Not Started" },
  {
    label: "AGM milestone",
    value: "agm_milestone",
    defaultCategory: "Governance",
  },
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

export function BoardCalendarWorkbench({
  data,
  errorsByPath,
  organizationName,
  sections,
  onChange,
  onDataChange,
}: {
  data: TemplateFormData;
  errorsByPath: Map<string, string>;
  organizationName: string;
  sections: TemplateSection[];
  onChange: (path: FieldPath, value: TemplateValue) => void;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
}) {
  const events = useMemo(() => buildCalendarEvents(data), [data]);
  const categoryColors = useMemo(() => buildCategoryColors(data), [data]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const configuredYear = getTemplateYear(data);
  const configuredMonth = getTemplateMonthIndex(data);
  const firstDatedEvent = events.find((event) => event.date);
  const todayKey = toDateKey(new Date());
  const configuredDate = new Date(configuredYear, configuredMonth, 1);
  const configuredDateKey = toDateKey(configuredDate);
  const initialDate =
    firstDatedEvent?.date ??
    (configuredDateKey < todayKey ? new Date() : configuredDate);
  const initialDateKey = firstDatedEvent?.dateKey ?? toDateKey(initialDate);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("calendar");
  const [anchorDate, setAnchorDate] = useState(initialDate);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [entryType, setEntryType] = useState<BoardCalendarEntryType>("meeting");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryCategory, setEntryCategory] = useState("Board Meeting");
  const [entryColor, setEntryColor] = useState(
    boardCalendarCategoryColorDefaults["Board Meeting"],
  );
  const [entryTime, setEntryTime] = useState("");
  const [entryLocation, setEntryLocation] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entryVirtualLink, setEntryVirtualLink] = useState("");
  const [entryLeadContact, setEntryLeadContact] = useState("");
  const [entryConfirmed, setEntryConfirmed] = useState("TBC");
  const [entryRelatedMeeting, setEntryRelatedMeeting] = useState("");
  const [entryResponsible, setEntryResponsible] = useState("");
  const [entryStatus, setEntryStatus] = useState("Not Started");
  const [entryDone, setEntryDone] = useState(false);
  const [entryWeeksBefore, setEntryWeeksBefore] = useState("0");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const monthIndex = anchorDate.getMonth();
  const year = anchorDate.getFullYear();
  const isSelectedDateInPast = selectedDateKey < todayKey;
  const nextEvent =
    events.find((event) => event.dateKey && event.dateKey >= todayKey) ??
    events.find((event) => event.dateKey);
  const boardMeetings = events.filter(
    (event) => event.category === "Board Meeting",
  ).length;
  const categories = Array.from(
    events.reduce<Map<string, string>>((items, event) => {
      if (!items.has(event.category)) items.set(event.category, event.color);
      return items;
    }, new Map()),
  ).slice(0, 8);
  const selectedSection = sections.find((section) => section.id === workspaceMode);
  const selectedDateEvents = eventsByDate.get(selectedDateKey) ?? [];
  const editingEvent = editingEventId
    ? events.find((event) => event.id === editingEventId) ?? null
    : null;

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
    setWorkspaceMode("calendar");
    setAnchorDate(date);
  }

  function updateEntryType(value: BoardCalendarEntryType) {
    const defaultCategory =
      entryTypes.find((option) => option.value === value)?.defaultCategory ??
      "Board Meeting";

    setEntryType(value);
    setEntryCategory(defaultCategory);
    setEntryColor(resolveEntryColor(defaultCategory));
    setEntryTime("");
    setEntryLocation("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("TBC");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus(value === "staff_task" ? defaultCategory : "Not Started");
    setEntryDone(false);
    setEntryWeeksBefore("0");
  }

  function addCalendarEntry() {
    if (!entryTitle.trim()) return;
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
      status: entryStatus,
      done: entryDone,
      weeksBefore: Number.parseInt(entryWeeksBefore, 10) || 0,
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

      return colorMutation
        ? setValue(nextData, colorMutation.path, colorMutation.value)
        : nextData;
    });
    clearEntryForm();
  }

  function clearEntryForm() {
    const defaultCategory =
      entryTypes.find((option) => option.value === entryType)?.defaultCategory ??
      "Board Meeting";

    setEditingEventId(null);
    setEntryCategory(defaultCategory);
    setEntryTitle("");
    setEntryColor(resolveEntryColor(defaultCategory));
    setEntryTime("");
    setEntryLocation("");
    setEntryNotes("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("TBC");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus(entryType === "staff_task" ? defaultCategory : "Not Started");
    setEntryDone(false);
    setEntryWeeksBefore("0");
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
    setEntryConfirmed(input.confirmed ?? "TBC");
    setEntryRelatedMeeting(input.relatedMeeting ?? "");
    setEntryResponsible(input.responsible ?? "");
    setEntryStatus(input.status ?? input.category ?? "Not Started");
    setEntryDone(Boolean(input.done));
    setEntryWeeksBefore(String(input.weeksBefore ?? 0));
    setWorkspaceMode("calendar");
    const date = parseCalendarDateKey(input.dateKey);
    if (date) setAnchorDate(date);
  }

  function deleteCalendarEntry(eventId: string) {
    const mutation = deleteBoardCalendarEntry(data, eventId);
    if (!mutation) return;

    onChange(mutation.path, mutation.value);
    clearEntryForm();
  }

  function getColorCategoryForInput(input: {
    category: string;
    status: string;
    type: BoardCalendarEntryType;
  }) {
    return input.type === "staff_task" ? input.status : input.category;
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
    <section className="space-y-4 rounded-xl border bg-white p-4 shadow-soft sm:space-y-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-olea-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-olea-dark">
            <CalendarDays className="size-3.5" />
            Calendar workspace
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
            {organizationName} board calendar
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
            Add meetings, notes, deadlines, staff tasks, and AGM milestones
            directly from the calendar. Annual and monthly views are generated
            from the same entries, so your workbook stays connected.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <div className="w-full sm:min-w-[260px] sm:flex-1 lg:flex-none">
            <Select
              value={workspaceMode}
              onValueChange={(value) => setWorkspaceMode(value as WorkspaceMode)}
            >
              <SelectTrigger aria-label="Choose calendar workspace view">
                <SelectValue placeholder="Choose a view" />
              </SelectTrigger>
              <SelectContent>
                {workspaceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </div>

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

      {workspaceMode === "calendar" ? (
        <>
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
        </>
      ) : selectedSection ? (
        <section
          className="rounded-xl border bg-white p-6 shadow-sm"
          aria-labelledby={`${selectedSection.id}-heading`}
        >
          <h3 id={`${selectedSection.id}-heading`} className="text-xl font-semibold">
            {selectedSection.title}
          </h3>
          {selectedSection.description ? (
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {selectedSection.description}
            </p>
          ) : null}
          <div
            className={cn(
              "mt-5",
              selectedSection.layout === "two_column"
                ? "grid gap-5 md:grid-cols-2"
                : "space-y-5",
            )}
          >
            <TemplateFields
              fields={selectedSection.questions}
              data={data}
              errorsByPath={errorsByPath}
              onChange={onChange}
            />
          </div>
        </section>
      ) : null}
    </section>
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
              {disabled ? (
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Past date
                </p>
              ) : null}
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
  dayNumber,
  disabled,
  events,
  muted,
  selected,
  onEditEvent,
  onSelect,
}: {
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
        {disabled ? (
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 md:inline">
            Past
          </span>
        ) : null}
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

  function confirmDeleteEntry() {
    if (!entryPendingDelete) return;

    onDeleteEntry(entryPendingDelete.id);
    setEntryPendingDelete(null);
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-slate-50 p-3 sm:p-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-5">
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

      <div
        className="rounded-xl bg-white p-3 shadow-sm sm:p-4"
        data-testid="board-calendar-entry-form"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-olea-light p-2 text-olea-dark">
            <Plus className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">
              {editingEventId ? "Edit entry" : "Add Entry"}
            </h3>
            <p className="text-sm text-slate-500">
              {editingEventId
                ? "Update this calendar item without leaving the calendar."
                : "This creates the matching workbook record automatically."}
            </p>
          </div>
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
              <Select value={entryCategory} onValueChange={onCategoryChange}>
                <SelectTrigger id="calendar-entry-category">
                  <SelectValue />
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
              <Select value={entryStatus} onValueChange={onStatusChange}>
                <SelectTrigger id="calendar-entry-status">
                  <SelectValue />
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="calendar-entry-title">Title</Label>
            <Input
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
                <Select value={entryConfirmed} onValueChange={onConfirmedChange}>
                  <SelectTrigger id="calendar-entry-confirmed">
                    <SelectValue />
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
                  placeholder="Board Meeting - Apr 15"
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
                <Label htmlFor="calendar-entry-weeks-before">Weeks before AGM</Label>
                <Input
                  id="calendar-entry-weeks-before"
                  type="number"
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
            disabled={!entryTitle.trim() || (!editingEventId && isSelectedDateInPast)}
            onClick={onAdd}
          >
            {editingEventId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editingEventId ? "Update entry" : "Add to calendar"}
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
