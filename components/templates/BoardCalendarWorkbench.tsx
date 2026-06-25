"use client";

import { useMemo, useState } from "react";
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
} from "@/lib/template-renderer/board-calendar-editor";
import {
  addDays,
  buildCalendarEvents,
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
  | "agm_timeline"
  | "colour_key";

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
  { label: "Colour key", value: "colour_key" },
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

export function BoardCalendarWorkbench({
  data,
  errorsByPath,
  organizationName,
  sections,
  onChange,
}: {
  data: TemplateFormData;
  errorsByPath: Map<string, string>;
  organizationName: string;
  sections: TemplateSection[];
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const events = useMemo(() => buildCalendarEvents(data), [data]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const configuredYear = getTemplateYear(data);
  const configuredMonth = getTemplateMonthIndex(data);
  const firstDatedEvent = events.find((event) => event.date);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("calendar");
  const [anchorDate, setAnchorDate] = useState(
    firstDatedEvent?.date ?? new Date(configuredYear, configuredMonth, 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(
    firstDatedEvent?.dateKey ??
      toDateKey(new Date(configuredYear, configuredMonth, 1)),
  );
  const [entryType, setEntryType] = useState<BoardCalendarEntryType>("meeting");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryCategory, setEntryCategory] = useState("Board Meeting");
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
  const todayKey = toDateKey(new Date());
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
    const mutation = editingEventId
      ? updateBoardCalendarEntry(data, editingEventId, input)
      : appendBoardCalendarEntry(data, input);

    if (!mutation) return;

    onChange(mutation.path, mutation.value);
    clearEntryForm();
  }

  function clearEntryForm() {
    setEditingEventId(null);
    setEntryTitle("");
    setEntryTime("");
    setEntryLocation("");
    setEntryNotes("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("TBC");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus("Not Started");
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

  return (
    <section className="space-y-5 rounded-xl border bg-white p-6 shadow-soft">
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

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="min-w-[260px]">
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
          <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
            {viewOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={mode === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border bg-white shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous calendar period"
              onClick={moveBackward}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="ghost" onClick={goToConfiguredYear}>
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
              onSelectDate={selectDate}
            />
          ) : mode === "week" ? (
            <WeekCalendar
              anchorDate={anchorDate}
              eventsByDate={eventsByDate}
              onSelectDate={selectDate}
              selectedDateKey={selectedDateKey}
            />
          ) : (
            <MonthCalendar
              eventsByDate={eventsByDate}
              monthIndex={monthIndex}
              onSelectDate={selectDate}
              selectedDateKey={selectedDateKey}
              year={year}
            />
          )}

          <CalendarEntryComposer
            entryCategory={entryCategory}
            entryLocation={entryLocation}
            entryNotes={entryNotes}
            entryTime={entryTime}
            entryTitle={entryTitle}
            entryType={entryType}
            selectedDateEvents={selectedDateEvents}
            selectedDateKey={selectedDateKey}
            onAdd={addCalendarEntry}
            onCategoryChange={setEntryCategory}
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
            onStatusChange={setEntryStatus}
            onDoneChange={setEntryDone}
            onDeleteEntry={deleteCalendarEntry}
            onSelectedDateChange={selectDate}
            editingEventId={editingEventId}
            entryConfirmed={entryConfirmed}
            entryDone={entryDone}
            entryLeadContact={entryLeadContact}
            entryRelatedMeeting={entryRelatedMeeting}
            entryResponsible={entryResponsible}
            entryStatus={entryStatus}
            entryVirtualLink={entryVirtualLink}
            entryWeeksBefore={entryWeeksBefore}
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
  year,
  onSelectDate,
}: {
  eventsByDate: Map<string, CalendarViewEvent[]>;
  monthIndex: number;
  selectedDateKey: string;
  year: number;
  onSelectDate: (dateKey: string) => void;
}) {
  const days = buildMonthGrid(year, monthIndex);

  return (
    <div className="overflow-hidden rounded-xl border">
      <CalendarWeekHeader />
      <div className="grid grid-cols-1 md:grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.dateKey}
            dayNumber={day.date.getDate()}
            events={eventsByDate.get(day.dateKey) ?? []}
            muted={!day.isCurrentMonth}
            selected={day.dateKey === selectedDateKey}
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
  onSelectDate,
}: {
  anchorDate: Date;
  eventsByDate: Map<string, CalendarViewEvent[]>;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const weekDays = getWeekDays(anchorDate);

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {weekDays.map((day) => {
        const dateKey = toDateKey(day);
        const events = eventsByDate.get(dateKey) ?? [];
        return (
          <button
            key={dateKey}
            type="button"
            className={cn(
              "rounded-xl border bg-white p-3 text-left transition hover:border-olea-green",
              selectedDateKey === dateKey && "border-olea-green ring-2 ring-olea-green/20",
            )}
            onClick={() => onSelectDate(dateKey)}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              {weekdayNames[day.getDay()]}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {monthNames[day.getMonth()].slice(0, 3)} {day.getDate()}
            </p>
            <div className="mt-3 space-y-2">
              {events.length ? (
                events.map((event) => (
                  <CalendarEventPill key={event.id} event={event} />
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                  No scheduled items
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function YearCalendar({
  events,
  year,
  onSelectDate,
}: {
  events: CalendarViewEvent[];
  year: number;
  onSelectDate: (dateKey: string) => void;
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
                    onSelectDate={
                      event.dateKey ? () => onSelectDate(event.dateKey!) : undefined
                    }
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
    <div className="hidden grid-cols-7 border-b bg-olea-dark text-center text-xs font-semibold uppercase tracking-[0.08em] text-white md:grid">
      {weekdayNames.map((day) => (
        <div
          key={day}
          className="border-r border-white/10 px-2 py-3 last:border-r-0"
        >
          {day.slice(0, 3)}
        </div>
      ))}
    </div>
  );
}

function DayCell({
  dayNumber,
  events,
  muted,
  selected,
  onSelect,
}: {
  dayNumber: number;
  events: CalendarViewEvent[];
  muted: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-[150px] border-b border-r bg-white p-3 text-left transition hover:border-olea-green last:border-r-0",
        muted && "bg-slate-50 text-slate-400",
        selected && "relative z-10 border-olea-green ring-2 ring-inset ring-olea-green",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
            muted ? "text-slate-400" : "bg-olea-light text-olea-dark",
          )}
        >
          {dayNumber}
        </span>
        {events.length > 3 ? (
          <span className="text-xs font-medium text-slate-400">
            +{events.length - 3}
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1.5">
        {events.slice(0, 3).map((event) => (
          <CalendarEventPill key={event.id} event={event} compact />
        ))}
      </div>
    </button>
  );
}

function CalendarEntryComposer({
  editingEventId,
  entryCategory,
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
  selectedDateEvents,
  selectedDateKey,
  onAdd,
  onCategoryChange,
  onCancelEdit,
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
  selectedDateEvents: CalendarViewEvent[];
  selectedDateKey: string;
  onAdd: () => void;
  onCategoryChange: (value: string) => void;
  onCancelEdit: () => void;
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

  return (
    <div className="grid gap-5 rounded-xl border bg-slate-50 p-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-xl bg-white p-4 shadow-sm">
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-8 px-2 text-xs"
                  onClick={() => onEditEvent(event)}
                >
                  <Pencil className="size-3.5" />
                  Edit entry
                </Button>
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

      <div className="rounded-xl bg-white p-4 shadow-sm">
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
              value={selectedDateKey}
              onChange={(event) => onSelectedDateChange(event.target.value)}
            />
            <p className="text-xs text-slate-500">
              Historical dates are allowed for past meetings and records.
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
              <Input
                id="calendar-entry-category"
                value={entryCategory}
                onChange={(event) => onCategoryChange(event.target.value)}
              />
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
        <Button
          type="button"
          className="mt-4"
          disabled={!entryTitle.trim()}
          onClick={onAdd}
        >
          {editingEventId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {editingEventId ? "Update entry" : "Add to calendar"}
        </Button>
        {editingEventId ? (
          <Button
            type="button"
            className="ml-2 mt-4"
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
            className="ml-2 mt-4"
            variant="destructive"
            onClick={() => onDeleteEntry(editingEventId)}
          >
            <Trash2 className="size-4" />
            Delete entry
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CalendarEventPill({
  event,
  compact = false,
  onSelectDate,
}: {
  event: CalendarViewEvent;
  compact?: boolean;
  onSelectDate?: () => void;
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
    onSelectDate && "w-full text-left transition hover:brightness-95",
  );
  const style = {
    backgroundColor: `${event.color}14`,
    borderColor: `${event.color}55`,
    color: event.color,
  };

  if (onSelectDate) {
    return (
      <button type="button" className={className} style={style} onClick={onSelectDate}>
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

function parseCalendarDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
