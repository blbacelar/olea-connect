import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { monthNames } from "@/lib/template-renderer/calendar-view";

import {
  CalendarEventPill,
  MonthCalendar,
  WeekCalendar,
  YearCalendar,
} from "./CalendarViews";
import { SummaryCard } from "./DashboardPanels";
import { CalendarEntryComposer } from "./EntryComposer";
import type { useBoardCalendarWorkbench } from "./use-board-calendar-workbench";
import { viewOptions } from "./workbench-options";

type BoardCalendarWorkbenchState = ReturnType<typeof useBoardCalendarWorkbench>;

export function DashboardTab({
  boardMeetings,
  eventCount,
  nextEventDate,
  nextEventTitle,
  upcomingEvents,
  onEditEvent,
  onViewCalendar,
}: {
  boardMeetings: number;
  eventCount: number;
  nextEventDate: string;
  nextEventTitle: string;
  upcomingEvents: BoardCalendarWorkbenchState["upcomingEvents"];
  onEditEvent: BoardCalendarWorkbenchState["editCalendarEntry"];
  onViewCalendar: () => void;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          icon={CalendarDays}
          label="Calendar items"
          value={String(eventCount)}
          detail="Meetings, deadlines, and AGM milestones"
        />
        <SummaryCard
          icon={Clock}
          label="Next dated item"
          value={nextEventDate}
          detail={nextEventTitle}
        />
        <SummaryCard
          icon={ListChecks}
          label="Board meetings"
          value={String(boardMeetings)}
          detail="Upcoming board meetings"
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
          <Button type="button" variant="outline" onClick={onViewCalendar}>
            View calendar
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {upcomingEvents.length ? (
            upcomingEvents.map((event) => (
              <CalendarEventPill
                key={event.id}
                event={event}
                onEditEvent={() => onEditEvent(event)}
              />
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No upcoming items yet. Use Add meeting to start the calendar.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

export function CalendarTab({ workbench }: { workbench: BoardCalendarWorkbenchState }) {
  return (
    <>
      <CalendarToolbar workbench={workbench} />
      {workbench.categories.length ? (
        <div className="flex flex-wrap gap-2 rounded-xl border bg-slate-50 p-3">
          {workbench.categories.map(([category, color]) => (
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
      {workbench.mode === "year" ? (
        <YearCalendar
          events={workbench.events}
          year={workbench.year}
          onEditEvent={workbench.editCalendarEntry}
        />
      ) : workbench.mode === "week" ? (
        <WeekCalendar
          anchorDate={workbench.anchorDate}
          eventsByDate={workbench.eventsByDate}
          onEditEvent={workbench.editCalendarEntry}
          onSelectDate={workbench.selectDate}
          selectedDateKey={workbench.selectedDateKey}
          todayKey={workbench.todayKey}
        />
      ) : (
        <MonthCalendar
          eventsByDate={workbench.eventsByDate}
          monthIndex={workbench.monthIndex}
          onEditEvent={workbench.editCalendarEntry}
          onSelectDate={workbench.selectDate}
          selectedDateKey={workbench.selectedDateKey}
          todayKey={workbench.todayKey}
          year={workbench.year}
        />
      )}
      <CalendarEntryComposer
        editingEvent={workbench.editingEvent}
        editingEventId={workbench.editingEventId}
        entryCategory={workbench.entryCategory}
        entryColor={workbench.entryColor}
        entryConfirmed={workbench.entryConfirmed}
        entryDone={workbench.entryDone}
        entryLeadContact={workbench.entryLeadContact}
        entryLocation={workbench.entryLocation}
        entryNotes={workbench.entryNotes}
        entryRelatedMeeting={workbench.entryRelatedMeeting}
        entryResponsible={workbench.entryResponsible}
        entryStatus={workbench.entryStatus}
        entryTime={workbench.entryTime}
        entryTitle={workbench.entryTitle}
        entryType={workbench.entryType}
        entryVirtualLink={workbench.entryVirtualLink}
        entryWeeksBefore={workbench.entryWeeksBefore}
        isEntryModalOpen={workbench.isEntryModalOpen}
        isEntryReady={workbench.isEntryReady}
        isSelectedDateInPast={workbench.isSelectedDateInPast}
        selectedDateEvents={workbench.selectedDateEvents}
        selectedDateKey={workbench.selectedDateKey}
        todayKey={workbench.todayKey}
        onAdd={workbench.addCalendarEntry}
        onCancelEdit={workbench.clearEntryForm}
        onCategoryChange={workbench.updateEntryCategory}
        onColorChange={workbench.setEntryColor}
        onConfirmedChange={workbench.setEntryConfirmed}
        onDeleteEntry={workbench.deleteCalendarEntry}
        onDoneChange={workbench.setEntryDone}
        onEditEvent={workbench.editCalendarEntry}
        onEntryTypeChange={workbench.updateEntryType}
        onLeadContactChange={workbench.setEntryLeadContact}
        onLocationChange={workbench.setEntryLocation}
        onNotesChange={workbench.setEntryNotes}
        onRelatedMeetingChange={workbench.setEntryRelatedMeeting}
        onResponsibleChange={workbench.setEntryResponsible}
        onSelectedDateChange={workbench.selectDate}
        onStatusChange={workbench.updateEntryStatus}
        onTimeChange={workbench.setEntryTime}
        onTitleChange={workbench.setEntryTitle}
        onVirtualLinkChange={workbench.setEntryVirtualLink}
        onWeeksBeforeChange={workbench.setEntryWeeksBefore}
      />
    </>
  );
}

function CalendarToolbar({
  workbench,
}: {
  workbench: BoardCalendarWorkbenchState;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid w-full grid-cols-3 rounded-lg border bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
        {viewOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={workbench.mode === option.value ? "default" : "ghost"}
            size="sm"
            onClick={() => workbench.setMode(option.value)}
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
          onClick={workbench.moveBackward}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-w-0 px-2 text-sm sm:px-4"
          onClick={workbench.goToConfiguredYear}
        >
          {workbench.mode === "year"
            ? workbench.year
            : `${monthNames[workbench.monthIndex]} ${workbench.year}`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next calendar period"
          onClick={workbench.moveForward}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
