"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { cn } from "@/lib/utils";

type CalendarMode = "month" | "week" | "year";

const viewOptions: Array<{ label: string; value: CalendarMode }> = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Year", value: "year" },
];

export function BoardCalendarWorkbench({
  data,
  organizationName,
}: {
  data: TemplateFormData;
  organizationName: string;
}) {
  const events = useMemo(() => buildCalendarEvents(data), [data]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const configuredYear = getTemplateYear(data);
  const configuredMonth = getTemplateMonthIndex(data);
  const firstDatedEvent = events.find((event) => event.date);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [anchorDate, setAnchorDate] = useState(
    firstDatedEvent?.date ?? new Date(configuredYear, configuredMonth, 1),
  );

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
            This view is generated from your meeting schedule, annual
            highlights, staff tasks, and AGM milestones. Edit the source tabs to
            update the calendar automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          detail={nextEvent?.title ?? "Add dates in the source tabs"}
        />
        <SummaryCard
          icon={ListChecks}
          label="Board meetings"
          value={String(boardMeetings)}
          detail="Pulled from Meeting Schedule"
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

      {mode === "year" ? (
        <YearCalendar events={events} year={year} />
      ) : mode === "week" ? (
        <WeekCalendar anchorDate={anchorDate} eventsByDate={eventsByDate} />
      ) : (
        <MonthCalendar
          eventsByDate={eventsByDate}
          monthIndex={monthIndex}
          year={year}
        />
      )}
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
  year,
}: {
  eventsByDate: Map<string, CalendarViewEvent[]>;
  monthIndex: number;
  year: number;
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
            muted={!day.isCurrentMonth}
            events={eventsByDate.get(day.dateKey) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function WeekCalendar({
  anchorDate,
  eventsByDate,
}: {
  anchorDate: Date;
  eventsByDate: Map<string, CalendarViewEvent[]>;
}) {
  const weekDays = getWeekDays(anchorDate);

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {weekDays.map((day) => {
        const dateKey = toDateKey(day);
        const events = eventsByDate.get(dateKey) ?? [];
        return (
          <div key={dateKey} className="rounded-xl border bg-white p-3">
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
          </div>
        );
      })}
    </div>
  );
}

function YearCalendar({
  events,
  year,
}: {
  events: CalendarViewEvent[];
  year: number;
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
                  <CalendarEventPill key={event.id} event={event} compact />
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
  muted,
  events,
}: {
  dayNumber: number;
  muted: boolean;
  events: CalendarViewEvent[];
}) {
  return (
    <div
      className={cn(
        "min-h-[150px] border-b border-r bg-white p-3 last:border-r-0",
        muted && "bg-slate-50 text-slate-400",
      )}
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
    </div>
  );
}

function CalendarEventPill({
  event,
  compact = false,
}: {
  event: CalendarViewEvent;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs leading-5 shadow-sm",
        compact ? "space-y-0.5" : "space-y-1",
      )}
      style={{
        backgroundColor: `${event.color}14`,
        borderColor: `${event.color}55`,
        color: event.color,
      }}
    >
      <p className="font-semibold text-slate-900">{event.title}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
        {event.dateKey ? <span>{event.dateKey}</span> : null}
        {event.time ? <span>{event.time}</span> : null}
        {event.location && !compact ? <span>{event.location}</span> : null}
      </div>
    </div>
  );
}
