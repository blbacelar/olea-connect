import { useState } from "react";

import {
  getBoardCalendarEntryInput,
  type BoardCalendarEntryType,
} from "@/lib/template-renderer/board-calendar-editor";
import {
  boardCalendarCategoryColorDefaults,
  type CalendarViewEvent,
} from "@/lib/template-renderer/calendar-view";
import type { TemplateFormData } from "@/lib/template-renderer/types";

import type { BoardCalendarModuleTab } from "./workbench-options";
import { parseCalendarDateKey } from "./workbench-ics";

type EntryFormState = {
  category: string;
  color: string;
  confirmed: string;
  done: boolean;
  leadContact: string;
  location: string;
  notes: string;
  relatedMeeting: string;
  responsible: string;
  status: string;
  time: string;
  title: string;
  type: BoardCalendarEntryType;
  virtualLink: string;
  weeksBefore: string;
};

type EntryFormField = keyof EntryFormState;

export function useBoardCalendarEntryForm({
  categoryColors,
  data,
  events,
  selectedDateKey,
  setActiveTab,
  setAnchorDate,
  setSelectedDateKey,
  todayKey,
}: {
  categoryColors: Map<string, string>;
  data: TemplateFormData;
  events: CalendarViewEvent[];
  selectedDateKey: string;
  setActiveTab: (tab: BoardCalendarModuleTab) => void;
  setAnchorDate: (date: Date) => void;
  setSelectedDateKey: (dateKey: string) => void;
  todayKey: string;
}) {
  const [form, setForm] = useState<EntryFormState>(createEmptyEntryForm());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const editingEvent = editingEventId
    ? events.find((event) => event.id === editingEventId) ?? null
    : null;
  const selectedColorCategory =
    form.type === "staff_task" ? form.status || "Not Started" : form.category;
  const isSelectedDateInPast = selectedDateKey < todayKey;
  const isEntryReady =
    Boolean(form.title.trim()) &&
    Boolean(selectedColorCategory.trim()) &&
    (Boolean(editingEventId) || !isSelectedDateInPast);

  function setEntryField<Key extends EntryFormField>(
    key: Key,
    value: EntryFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEntryType(value: BoardCalendarEntryType) {
    setForm(createEmptyEntryForm(value));
  }

  function updateEntryCategory(value: string) {
    setForm((current) => ({
      ...current,
      category: value,
      color: resolveEntryColor(value),
    }));
  }

  function updateEntryStatus(value: string) {
    setForm((current) => ({
      ...current,
      color: current.type === "staff_task" ? resolveEntryColor(value) : current.color,
      status: value,
    }));
  }

  function clearEntryForm() {
    setEditingEventId(null);
    setForm(createEmptyEntryForm());
    setIsEntryModalOpen(false);
  }

  function editCalendarEntry(event: CalendarViewEvent) {
    const input = getBoardCalendarEntryInput(data, event.id);
    if (!input) return;

    setEditingEventId(event.id);
    setSelectedDateKey(input.dateKey || event.dateKey || selectedDateKey);
    setForm(createEntryFormFromInput(input, event.color));
    setActiveTab("calendar");
    setIsEntryModalOpen(true);
    const date = parseCalendarDateKey(input.dateKey);
    if (date) setAnchorDate(date);
  }

  function openMeetingComposer() {
    const fallbackDateKey = selectedDateKey < todayKey ? todayKey : selectedDateKey;
    const fallbackDate = parseCalendarDateKey(fallbackDateKey);

    setActiveTab("calendar");
    setSelectedDateKey(fallbackDateKey);
    if (fallbackDate) setAnchorDate(fallbackDate);
    setEditingEventId(null);
    setForm(createEmptyEntryForm("meeting"));
    setIsEntryModalOpen(true);
  }

  function resolveEntryColor(category: string) {
    return (
      categoryColors.get(category) ??
      boardCalendarCategoryColorDefaults[category] ??
      boardCalendarCategoryColorDefaults["Other / General"]
    );
  }

  return {
    clearEntryForm,
    editCalendarEntry,
    editingEvent,
    editingEventId,
    entryCategory: form.category,
    entryColor: form.color,
    entryConfirmed: form.confirmed,
    entryDone: form.done,
    entryLeadContact: form.leadContact,
    entryLocation: form.location,
    entryNotes: form.notes,
    entryRelatedMeeting: form.relatedMeeting,
    entryResponsible: form.responsible,
    entryStatus: form.status,
    entryTime: form.time,
    entryTitle: form.title,
    entryType: form.type,
    entryVirtualLink: form.virtualLink,
    entryWeeksBefore: form.weeksBefore,
    isEntryModalOpen,
    isEntryReady,
    isSelectedDateInPast,
    openMeetingComposer,
    setEntryCategory: (value: string) => setEntryField("category", value),
    setEntryColor: (value: string) => setEntryField("color", value),
    setEntryConfirmed: (value: string) => setEntryField("confirmed", value),
    setEntryDone: (value: boolean) => setEntryField("done", value),
    setEntryLeadContact: (value: string) => setEntryField("leadContact", value),
    setEntryLocation: (value: string) => setEntryField("location", value),
    setEntryNotes: (value: string) => setEntryField("notes", value),
    setEntryRelatedMeeting: (value: string) =>
      setEntryField("relatedMeeting", value),
    setEntryResponsible: (value: string) => setEntryField("responsible", value),
    setEntryStatus: (value: string) => setEntryField("status", value),
    setEntryTime: (value: string) => setEntryField("time", value),
    setEntryTitle: (value: string) => setEntryField("title", value),
    setEntryVirtualLink: (value: string) => setEntryField("virtualLink", value),
    setEntryWeeksBefore: (value: string) => setEntryField("weeksBefore", value),
    updateEntryCategory,
    updateEntryStatus,
    updateEntryType,
  };
}

function createEmptyEntryForm(
  type: BoardCalendarEntryType = "meeting",
): EntryFormState {
  return {
    category: "",
    color: boardCalendarCategoryColorDefaults["Other / General"],
    confirmed: "",
    done: false,
    leadContact: "",
    location: "",
    notes: "",
    relatedMeeting: "",
    responsible: "",
    status: type === "staff_task" ? "Not Started" : "",
    time: "",
    title: "",
    type,
    virtualLink: "",
    weeksBefore: "",
  };
}

function createEntryFormFromInput(
  input: NonNullable<ReturnType<typeof getBoardCalendarEntryInput>>,
  color: string,
): EntryFormState {
  return {
    category: input.category,
    color,
    confirmed: input.confirmed ?? "",
    done: Boolean(input.done),
    leadContact: input.leadContact ?? "",
    location: input.location ?? "",
    notes: input.notes ?? "",
    relatedMeeting: input.relatedMeeting ?? "",
    responsible: input.responsible ?? "",
    status: getEntryStatus(input),
    time: input.time ?? "",
    title: input.title,
    type: input.type,
    virtualLink: input.virtualLink ?? "",
    weeksBefore: getEntryWeeksBefore(input),
  };
}

function getEntryStatus(
  input: NonNullable<ReturnType<typeof getBoardCalendarEntryInput>>,
) {
  return input.type === "staff_task"
    ? input.status || "Not Started"
    : input.status ?? input.category ?? "";
}

function getEntryWeeksBefore(
  input: NonNullable<ReturnType<typeof getBoardCalendarEntryInput>>,
) {
  if (input.daysBeforeAgm === undefined && input.weeksBefore === undefined) {
    return "";
  }

  return String(input.daysBeforeAgm ?? (input.weeksBefore ?? 0) * 7);
}
