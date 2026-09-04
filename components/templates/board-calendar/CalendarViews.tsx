import { Badge } from "@/components/ui/badge";
import {
  buildMonthGrid,
  getWeekDays,
  monthNames,
  toDateKey,
  weekdayNames,
  type CalendarViewEvent,
} from "@/lib/template-renderer/calendar-view";
import { cn } from "@/lib/utils";

export function MonthCalendar({
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

export function WeekCalendar({
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
              selectedDateKey === dateKey &&
                "border-olea-green ring-2 ring-olea-green/20",
            )}
          >
            <button
              type="button"
              disabled={disabled}
              className="w-full rounded-lg text-left transition hover:text-olea-green disabled:cursor-not-allowed disabled:hover:text-inherit"
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

export function YearCalendar({
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

export function CalendarEventPill({
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

  if (!onEditEvent) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

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
        disabled && "bg-slate-100 text-slate-400 opacity-70",
        selected &&
          "relative z-10 border-olea-green ring-2 ring-inset ring-olea-green",
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
