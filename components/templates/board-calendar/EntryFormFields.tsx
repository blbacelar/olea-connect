import type { RefObject } from "react";

import { Checkbox } from "@/components/ui/checkbox";
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
import type { BoardCalendarEntryType } from "@/lib/template-renderer/board-calendar-editor";
import { cn } from "@/lib/utils";

import {
  agmTrackOptions,
  annualHighlightCategoryOptions,
  entryTypes,
  meetingCategoryOptions,
  statusOptions,
} from "./workbench-options";
import { AgmFields, MeetingFields, OwnerFields } from "./EntryFieldGroups";

export function EntryFormFields({
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
  isSelectedDateInPast,
  selectedDateKey,
  selectedColorCategory,
  titleInputRef,
  todayKey,
  onCategoryChange,
  onColorChange,
  onConfirmedChange,
  onDoneChange,
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
}: EntryFormFieldsProps) {
  const isMeeting = entryType === "meeting";
  const isAnnualHighlight = entryType === "annual_highlight";
  const isStaffTask = entryType === "staff_task";
  const isAgmMilestone = entryType === "agm_milestone";
  const categoryOptions = isAgmMilestone
    ? agmTrackOptions
    : isAnnualHighlight
      ? annualHighlightCategoryOptions
      : meetingCategoryOptions;

  return (
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
              <SelectValue
                placeholder={isAgmMilestone ? "Choose track" : "Choose category"}
              />
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
          <Select value={entryStatus || undefined} onValueChange={onStatusChange}>
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
        <MeetingFields
          entryConfirmed={entryConfirmed}
          entryLeadContact={entryLeadContact}
          entryLocation={entryLocation}
          entryTime={entryTime}
          entryVirtualLink={entryVirtualLink}
          onConfirmedChange={onConfirmedChange}
          onLeadContactChange={onLeadContactChange}
          onLocationChange={onLocationChange}
          onTimeChange={onTimeChange}
          onVirtualLinkChange={onVirtualLinkChange}
        />
      ) : null}
      {isStaffTask ? (
        <OwnerFields
          entryRelatedMeeting={entryRelatedMeeting}
          entryResponsible={entryResponsible}
          onRelatedMeetingChange={onRelatedMeetingChange}
          onResponsibleChange={onResponsibleChange}
        />
      ) : null}
      {isAgmMilestone ? (
        <AgmFields
          entryResponsible={entryResponsible}
          entryWeeksBefore={entryWeeksBefore}
          onResponsibleChange={onResponsibleChange}
          onWeeksBeforeChange={onWeeksBeforeChange}
        />
      ) : null}
      {isAnnualHighlight ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 md:col-span-2">
          Annual notes use the selected calendar date and automatically set the
          matching month in the workbook.
        </p>
      ) : null}
      {isStaffTask || isAgmMilestone ? (
        <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
          <Checkbox
            checked={entryDone}
            onChange={(event) => onDoneChange(event.target.checked)}
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
  );
}

interface EntryFormFieldsProps {
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
  isSelectedDateInPast: boolean;
  selectedColorCategory: string;
  selectedDateKey: string;
  titleInputRef: RefObject<HTMLInputElement>;
  todayKey: string;
  onCategoryChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onConfirmedChange: (value: string) => void;
  onDoneChange: (value: boolean) => void;
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
}
