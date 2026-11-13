import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
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
import { viewOptions, type CalendarMode } from "./workbench-options";

type BoardCalendarWorkbenchState = ReturnType<typeof useBoardCalendarWorkbench>;

export function DashboardTab({
  boardMeetings,
  eventCount,
  nextEventDate,
  nextEventTitle,
  upcomingEvents,
  onEditEvent,
  onViewCalendar,
  french = false,
}: {
  boardMeetings: number;
  eventCount: number;
  nextEventDate: string;
  nextEventTitle: string;
  upcomingEvents: BoardCalendarWorkbenchState["upcomingEvents"];
  onEditEvent: BoardCalendarWorkbenchState["editCalendarEntry"];
  onViewCalendar: () => void;
  french?: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          icon={CalendarDays}
          label={french ? "Éléments au calendrier" : "Calendar items"}
          value={String(eventCount)}
          detail={french ? "Réunions, échéances et jalons de l’AGA" : "Meetings, deadlines, and AGM milestones"}
        />
        <SummaryCard
          icon={Clock}
          label={french ? "Prochain événement" : "Next dated item"}
          value={nextEventDate}
          detail={nextEventTitle}
        />
        <SummaryCard
          icon={ListChecks}
          label={french ? "Réunions du conseil" : "Board meetings"}
          value={String(boardMeetings)}
          detail={french ? "Réunions à venir" : "Upcoming board meetings"}
        />
      </div>
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              {french ? "Activités à venir du conseil" : "Upcoming board work"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {french ? "Un aperçu des prochaines réunions, échéances et tâches de l’équipe." : "A quick read on the next meetings, deadlines, and staff work."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onViewCalendar}>
            {french ? "Voir le calendrier" : "View calendar"}
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
              {french ? "Aucun élément à venir. Ajoutez une entrée pour commencer." : "No upcoming items yet. Use Add calendar entry to start the calendar."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

export function CalendarTab({ workbench, readOnly = false }: { workbench: BoardCalendarWorkbenchState; readOnly?: boolean }) {
  const french = useLocaleContext().locale === "fr-CA";
  return (
    <>
      <CalendarToolbar workbench={workbench} french={french} />
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
      {workbench.mode === "list" ? (
        <div className="space-y-2 rounded-xl border bg-white p-4">
          {workbench.events.length ? [...workbench.events]
            .sort((left, right) => (left.dateKey ?? "9999").localeCompare(right.dateKey ?? "9999"))
            .map((meeting) => <Button key={meeting.id} type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal px-4 py-3 text-left" onClick={() => workbench.editCalendarEntry(meeting)}>
              <span className="w-24 shrink-0 font-semibold">{meeting.dateKey ?? (french ? "Sans date" : "No date")}</span>
              <span className="min-w-0 flex-1"><strong className="block">{meeting.title}</strong><span className="text-xs text-slate-600">{[meeting.time, meeting.location].filter(Boolean).join(" · ") || meeting.category}</span></span>
            </Button>) : <p className="p-4 text-sm text-slate-600">{french ? "Aucun élément au calendrier pour le moment." : "No calendar items yet."}</p>}
        </div>
      ) : workbench.mode === "year" ? (
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
        readOnly={readOnly}
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
        entryRepeat={workbench.entryRepeat}
        entryGeneratePrepTasks={workbench.entryGeneratePrepTasks}
        entryNotifyMode={workbench.entryNotifyMode}
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
        setEntryRepeat={workbench.setEntryRepeat}
        setEntryGeneratePrepTasks={workbench.setEntryGeneratePrepTasks}
        setEntryNotifyMode={workbench.setEntryNotifyMode}
      />
    </>
  );
}

function CalendarToolbar({
  workbench,
  french,
}: {
  workbench: BoardCalendarWorkbenchState;
  french: boolean;
}) {
  const viewLabels: Record<CalendarMode, string> = french
    ? { month: "Mois", week: "Semaine", year: "Année", list: "Liste" }
    : { month: "Month", week: "Week", year: "Annual", list: "List" };
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid w-full grid-cols-4 rounded-lg border bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
        {viewOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={workbench.mode === option.value ? "default" : "ghost"}
            size="sm"
            onClick={() => workbench.setMode(option.value)}
            className="w-full sm:w-auto"
          >
            {viewLabels[option.value]}
          </Button>
        ))}
      </div>
      {workbench.mode !== "list" ? <div className="grid w-full grid-cols-[auto_1fr_auto] rounded-lg border bg-white shadow-sm sm:inline-flex sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={french ? "Période précédente" : "Previous calendar period"}
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
            : french ? `${new Intl.DateTimeFormat("fr-CA", { month: "long" }).format(new Date(workbench.year, workbench.monthIndex, 1))} ${workbench.year}`
              : `${monthNames[workbench.monthIndex]} ${workbench.year}`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={french ? "Période suivante" : "Next calendar period"}
          onClick={workbench.moveForward}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div> : null}
    </div>
  );
}
