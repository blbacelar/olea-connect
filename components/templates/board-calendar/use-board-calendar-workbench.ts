import { useState } from "react";

import {
  appendBoardCalendarEntry,
  deleteBoardCalendarEntry,
  syncBoardCalendarGeneratedTasks,
  updateBoardCalendarEntry,
  upsertBoardCalendarCategoryColor,
  type BoardCalendarEntryType,
} from "@/lib/template-renderer/board-calendar-editor";
import { addDays } from "@/lib/template-renderer/calendar-view";
import { setValue } from "@/lib/template-renderer/schema";
import type {
  TemplateExportFormat,
  TemplateExportRecord,
  TemplateFormData,
} from "@/lib/template-renderer/types";

import type { CalendarMode } from "./workbench-options";
import { useBoardCalendarActiveTab } from "./use-board-calendar-active-tab";
import { useBoardCalendarEntryForm } from "./use-board-calendar-entry-form";
import { useWorkbenchDerivedData } from "./use-workbench-derived-data";
import { downloadBoardCalendarIcs, parseCalendarDateKey } from "./workbench-ics";

export function useBoardCalendarWorkbench({
  data,
  templateInstanceId,
  organizationName,
  generateExport,
  createDownloadUrl,
  onDataChange,
}: {
  data: TemplateFormData;
  templateInstanceId?: string;
  organizationName: string;
  generateExport: (input: {
    templateInstanceId: string;
    format: TemplateExportFormat;
  }) => Promise<TemplateExportRecord>;
  createDownloadUrl: (exportId: string) => Promise<string>;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
}) {
  const todayDate = new Date();
  const {
    boardMeetings, categories, categoryColors, configuredMonth, configuredYear,
    events, eventsByDate, hasDatedEvents, meetingEvents, nextEvent, todayKey,
    upcomingEvents, upcomingMeetingEvents,
  } = useWorkbenchDerivedData({ data, todayDate });
  const [mode, setMode] = useState<CalendarMode>("month");
  const { activeTab, setActiveTab } = useBoardCalendarActiveTab();
  const [anchorDate, setAnchorDate] = useState(todayDate);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");

  const monthIndex = anchorDate.getMonth();
  const year = anchorDate.getFullYear();
  const selectedDateEvents = eventsByDate.get(selectedDateKey) ?? [];
  const entry = useBoardCalendarEntryForm({
    categoryColors,
    data,
    events,
    selectedDateKey,
    setActiveTab,
    setAnchorDate,
    setSelectedDateKey,
    todayKey,
  });

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

  function addCalendarEntry() {
    if (!entry.isEntryReady) return;
    if (!entry.editingEventId && entry.isSelectedDateInPast) return;

    const input = buildCalendarEntryInput(entry, selectedDateKey);
    onDataChange((currentData) =>
      applyCalendarEntryMutation({
        currentData,
        editingEventId: entry.editingEventId,
        entryColor: entry.entryColor,
        input,
      }),
    );
    entry.clearEntryForm();
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
    entry.clearEntryForm();
  }

  async function exportPdf() {
    if (!templateInstanceId) {
      window.print();
      return;
    }

    setIsExportingPdf(true);
    try {
      const generated = await generateExport({ templateInstanceId, format: "pdf" });
      const signedUrl = await createDownloadUrl(generated.id);
      window.location.assign(signedUrl);
      setExportError("");
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Unable to generate this PDF export.",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  return {
    activeTab, addCalendarEntry, addToCalendarFile: () =>
      downloadBoardCalendarIcs({ events, organizationName }), anchorDate, boardMeetings,
    categories, clearEntryForm: entry.clearEntryForm,
    editCalendarEntry: entry.editCalendarEntry, editingEvent: entry.editingEvent,
    editingEventId: entry.editingEventId, entryCategory: entry.entryCategory,
    entryColor: entry.entryColor, entryConfirmed: entry.entryConfirmed,
    entryDone: entry.entryDone, entryLeadContact: entry.entryLeadContact,
    entryLocation: entry.entryLocation, entryNotes: entry.entryNotes,
    entryRelatedMeeting: entry.entryRelatedMeeting,
    entryResponsible: entry.entryResponsible, entryStatus: entry.entryStatus,
    entryTime: entry.entryTime, entryTitle: entry.entryTitle,
    entryType: entry.entryType, entryVirtualLink: entry.entryVirtualLink,
    entryWeeksBefore: entry.entryWeeksBefore,
    events, eventsByDate, exportError, exportPdf, goToConfiguredYear,
    hasDatedEvents, isEntryModalOpen: entry.isEntryModalOpen,
    isEntryReady: entry.isEntryReady, isExportingPdf,
    isSelectedDateInPast: entry.isSelectedDateInPast, meetingEvents, mode,
    monthIndex, moveBackward, moveForward, nextEvent,
    openMeetingComposer: entry.openMeetingComposer, selectedDateEvents,
    selectedDateKey, setActiveTab, setEntryColor: entry.setEntryColor,
    setEntryConfirmed: entry.setEntryConfirmed, setEntryDone: entry.setEntryDone,
    setEntryLeadContact: entry.setEntryLeadContact,
    setEntryLocation: entry.setEntryLocation, setEntryNotes: entry.setEntryNotes,
    setEntryRelatedMeeting: entry.setEntryRelatedMeeting,
    setEntryResponsible: entry.setEntryResponsible,
    setEntryTime: entry.setEntryTime, setEntryTitle: entry.setEntryTitle,
    setEntryVirtualLink: entry.setEntryVirtualLink,
    setEntryWeeksBefore: entry.setEntryWeeksBefore, setMode, todayKey,
    upcomingEvents, upcomingMeetingEvents,
    updateEntryCategory: entry.updateEntryCategory,
    updateEntryStatus: entry.updateEntryStatus,
    updateEntryType: entry.updateEntryType, year, selectDate,
    deleteCalendarEntry,
  };
}

type EntryController = ReturnType<typeof useBoardCalendarEntryForm>;

function buildCalendarEntryInput(
  entry: EntryController,
  selectedDateKey: string,
) {
  return {
    category: entry.entryCategory,
    confirmed: entry.entryConfirmed,
    dateKey: selectedDateKey,
    daysBeforeAgm: Number.parseInt(entry.entryWeeksBefore, 10) || 0,
    done: entry.entryDone,
    leadContact: entry.entryLeadContact,
    location: entry.entryLocation,
    notes: entry.entryNotes,
    relatedMeeting: entry.entryRelatedMeeting,
    responsible: entry.entryResponsible,
    status: getCalendarEntryStatus(entry),
    time: entry.entryTime,
    title: entry.entryTitle,
    type: entry.entryType,
    virtualLink: entry.entryVirtualLink,
  };
}

function applyCalendarEntryMutation({
  currentData,
  editingEventId,
  entryColor,
  input,
}: {
  currentData: TemplateFormData;
  editingEventId: string | null;
  entryColor: string;
  input: ReturnType<typeof buildCalendarEntryInput>;
}) {
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
}

function getCalendarEntryStatus(entry: EntryController) {
  return entry.entryType === "staff_task"
    ? entry.entryStatus || "Not Started"
    : entry.entryStatus;
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
