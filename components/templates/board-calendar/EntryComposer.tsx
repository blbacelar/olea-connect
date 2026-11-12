import { useEffect, useRef, useState } from "react";
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BoardCalendarEntryType } from "@/lib/template-renderer/board-calendar-editor";
import type { CalendarViewEvent } from "@/lib/template-renderer/calendar-view";
import { cn } from "@/lib/utils";

import { CalendarEventPill } from "./CalendarViews";
import { DeleteEntryDialog } from "./DeleteEntryDialog";
import { EntryFormFields } from "./EntryFormFields";

export function CalendarEntryComposer(props: CalendarEntryComposerProps) {
  const [entryPendingDelete, setEntryPendingDelete] =
    useState<CalendarViewEvent | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!props.isEntryModalOpen) return;
    const frame = window.requestAnimationFrame(() => titleInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [props.isEntryModalOpen]);

  const selectedColorCategory =
    props.entryType === "staff_task"
      ? props.entryStatus || "Not Started"
      : props.entryCategory;

  function confirmDeleteEntry() {
    if (!entryPendingDelete) return;
    props.onDeleteEntry(entryPendingDelete.id);
    setEntryPendingDelete(null);
  }

  return (
    <div className="rounded-xl border bg-slate-50 p-3 sm:p-4">
      <SelectedDatePanel
        readOnly={props.readOnly}
        editingEventId={props.editingEventId}
        events={props.selectedDateEvents}
        selectedDateKey={props.selectedDateKey}
        onEditEvent={props.onEditEvent}
        onPendingDeleteChange={setEntryPendingDelete}
      />

      <Dialog
        open={props.isEntryModalOpen}
        onOpenChange={(open) => !open && props.onCancelEdit()}
      >
        <DialogContent className="max-w-4xl" data-testid="board-calendar-entry-form">
          <DialogHeader>
            <div className="flex items-center gap-2 pr-8">
              <div className="rounded-lg bg-olea-light p-2 text-olea-dark">
                {props.editingEventId ? (
                  <Pencil className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base">
                  {props.readOnly ? "Calendar entry" : props.editingEventId ? "Edit calendar entry" : "Add calendar entry"}
                </DialogTitle>
                <DialogDescription>
                  {props.readOnly ? "View this calendar item and its details." : props.editingEventId
                    ? "Update this calendar item without leaving the calendar."
                    : "This creates the matching workbook record automatically."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <fieldset disabled={props.readOnly}><EntryFormFields
            {...props}
            selectedColorCategory={selectedColorCategory}
            titleInputRef={titleInputRef}
          /></fieldset>
          <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
            {props.readOnly ? <Button type="button" variant="outline" onClick={props.onCancelEdit}>Close</Button> : null}
            {!props.readOnly ? <>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!props.isEntryReady}
              onClick={props.onAdd}
            >
              {props.editingEventId ? (
                <Pencil className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {props.editingEventId ? "Update entry" : "Add entry"}
            </Button>
            {props.editingEventId ? (
              <>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  variant="outline"
                  onClick={props.onCancelEdit}
                >
                  <X className="size-4" />
                  Cancel edit
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  variant="destructive"
                  onClick={() => setEntryPendingDelete(props.editingEvent)}
                >
                  <Trash2 className="size-4" />
                  Delete entry
                </Button>
              </>
            ) : null}
            </> : null}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteEntryDialog
        event={entryPendingDelete}
        onCancel={() => setEntryPendingDelete(null)}
        onConfirm={confirmDeleteEntry}
      />
    </div>
  );
}

function SelectedDatePanel({
  readOnly,
  editingEventId,
  events,
  selectedDateKey,
  onEditEvent,
  onPendingDeleteChange,
}: {
  readOnly?: boolean;
  editingEventId: string | null;
  events: CalendarViewEvent[];
  selectedDateKey: string;
  onEditEvent: (event: CalendarViewEvent) => void;
  onPendingDeleteChange: (event: CalendarViewEvent) => void;
}) {
  return (
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
        {events.length ? (
          events.map((event) => (
            <div
              key={event.id}
              className={cn(
                "rounded-xl border bg-white p-2",
                editingEventId === event.id &&
                  "border-olea-green ring-2 ring-olea-green/20",
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
                  {readOnly ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
                  {readOnly ? "View entry" : "Edit entry"}
                </Button>
                {!readOnly ?
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 justify-start px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800 sm:justify-center"
                  onClick={() => onPendingDeleteChange(event)}
                >
                  <Trash2 className="size-3.5" />
                  Delete entry
                </Button> : null}
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
  );
}

interface CalendarEntryComposerProps {
  readOnly?: boolean;
  editingEvent: CalendarViewEvent | null;
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
  entryRepeat: "1" | "3" | "6" | "12";
  entryGeneratePrepTasks: boolean;
  entryNotifyMode: "review" | "auto" | "none";
  isEntryModalOpen: boolean;
  isEntryReady: boolean;
  isSelectedDateInPast: boolean;
  selectedDateEvents: CalendarViewEvent[];
  selectedDateKey: string;
  todayKey: string;
  onAdd: () => void;
  onCancelEdit: () => void;
  onCategoryChange: (value: string) => void;
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
  setEntryRepeat: (value: "1" | "3" | "6" | "12") => void;
  setEntryGeneratePrepTasks: (value: boolean) => void;
  setEntryNotifyMode: (value: "review" | "auto" | "none") => void;
}
