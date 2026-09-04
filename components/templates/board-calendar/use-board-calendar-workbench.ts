import { useState } from "react";

import {
  appendBoardCalendarEntry,
  deleteBoardCalendarEntry,
  getBoardCalendarEntryInput,
  syncBoardCalendarGeneratedTasks,
  type BoardCalendarEntryType,
  updateBoardCalendarEntry,
  upsertBoardCalendarCategoryColor,
} from "@/lib/template-renderer/board-calendar-editor";
import {
  addDays,
  boardCalendarCategoryColorDefaults,
  type CalendarViewEvent,
} from "@/lib/template-renderer/calendar-view";
import { setValue } from "@/lib/template-renderer/schema";
import type { TemplateExportFormat, TemplateExportRecord, TemplateFormData } from "@/lib/template-renderer/types";

import type { CalendarMode } from "./workbench-options";
import { useBoardCalendarActiveTab } from "./use-board-calendar-active-tab";
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
  const [entryType, setEntryType] = useState<BoardCalendarEntryType>("meeting");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryCategory, setEntryCategory] = useState("");
  const [entryColor, setEntryColor] = useState(
    boardCalendarCategoryColorDefaults["Other / General"],
  );
  const [entryTime, setEntryTime] = useState("");
  const [entryLocation, setEntryLocation] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entryVirtualLink, setEntryVirtualLink] = useState("");
  const [entryLeadContact, setEntryLeadContact] = useState("");
  const [entryConfirmed, setEntryConfirmed] = useState("");
  const [entryRelatedMeeting, setEntryRelatedMeeting] = useState("");
  const [entryResponsible, setEntryResponsible] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [entryDone, setEntryDone] = useState(false);
  const [entryWeeksBefore, setEntryWeeksBefore] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");

  const monthIndex = anchorDate.getMonth();
  const year = anchorDate.getFullYear();
  const isSelectedDateInPast = selectedDateKey < todayKey;
  const selectedDateEvents = eventsByDate.get(selectedDateKey) ?? [];
  const editingEvent = editingEventId
    ? events.find((event) => event.id === editingEventId) ?? null
    : null;
  const selectedColorCategory =
    entryType === "staff_task" ? entryStatus || "Not Started" : entryCategory;
  const isEntryReady =
    Boolean(entryTitle.trim()) &&
    Boolean(selectedColorCategory.trim()) &&
    (Boolean(editingEventId) || !isSelectedDateInPast);

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

  function updateEntryType(value: BoardCalendarEntryType) {
    setEntryType(value);
    setEntryCategory("");
    setEntryColor(boardCalendarCategoryColorDefaults["Other / General"]);
    setEntryTime("");
    setEntryLocation("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus(value === "staff_task" ? "Not Started" : "");
    setEntryDone(false);
    setEntryWeeksBefore("");
  }

  function addCalendarEntry() {
    if (!isEntryReady) return;
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
      status:
        entryType === "staff_task" ? entryStatus || "Not Started" : entryStatus,
      done: entryDone,
      daysBeforeAgm: Number.parseInt(entryWeeksBefore, 10) || 0,
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

      const nextDataWithColor = colorMutation
        ? setValue(nextData, colorMutation.path, colorMutation.value)
        : nextData;

      return input.type === "meeting"
        ? syncBoardCalendarGeneratedTasks(nextDataWithColor)
        : nextDataWithColor;
    });
    clearEntryForm();
  }

  function clearEntryForm() {
    setEditingEventId(null);
    setEntryCategory("");
    setEntryTitle("");
    setEntryColor(boardCalendarCategoryColorDefaults["Other / General"]);
    setEntryTime("");
    setEntryLocation("");
    setEntryNotes("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus("");
    setEntryDone(false);
    setEntryWeeksBefore("");
    setIsEntryModalOpen(false);
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
    setEntryConfirmed(input.confirmed ?? "");
    setEntryRelatedMeeting(input.relatedMeeting ?? "");
    setEntryResponsible(input.responsible ?? "");
    setEntryStatus(
      input.type === "staff_task"
        ? input.status || "Not Started"
        : input.status ?? input.category ?? "",
    );
    setEntryDone(Boolean(input.done));
    setEntryWeeksBefore(
      input.daysBeforeAgm === undefined && input.weeksBefore === undefined
        ? ""
        : String(input.daysBeforeAgm ?? (input.weeksBefore ?? 0) * 7),
    );
    setActiveTab("calendar");
    setIsEntryModalOpen(true);
    const date = parseCalendarDateKey(input.dateKey);
    if (date) setAnchorDate(date);
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
    clearEntryForm();
  }

  function openMeetingComposer() {
    const fallbackDateKey = selectedDateKey < todayKey ? todayKey : selectedDateKey;
    const fallbackDate = parseCalendarDateKey(fallbackDateKey);

    setActiveTab("calendar");
    setSelectedDateKey(fallbackDateKey);
    if (fallbackDate) setAnchorDate(fallbackDate);
    setEditingEventId(null);
    setEntryType("meeting");
    setEntryCategory("");
    setEntryColor(boardCalendarCategoryColorDefaults["Other / General"]);
    setEntryTitle("");
    setEntryTime("");
    setEntryLocation("");
    setEntryNotes("");
    setEntryVirtualLink("");
    setEntryLeadContact("");
    setEntryConfirmed("");
    setEntryRelatedMeeting("");
    setEntryResponsible("");
    setEntryStatus("");
    setEntryDone(false);
    setEntryWeeksBefore("");
    setIsEntryModalOpen(true);
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

  function addToCalendarFile() {
    downloadBoardCalendarIcs({ events, organizationName });
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
    if (entryType === "staff_task") setEntryColor(resolveEntryColor(value));
  }

  return {
    activeTab, addCalendarEntry, addToCalendarFile, anchorDate, boardMeetings,
    categories, clearEntryForm, editCalendarEntry, editingEvent, editingEventId,
    entryCategory, entryColor, entryConfirmed, entryDone, entryLeadContact,
    entryLocation, entryNotes, entryRelatedMeeting, entryResponsible, entryStatus,
    entryTime, entryTitle, entryType, entryVirtualLink, entryWeeksBefore,
    events, eventsByDate, exportError, exportPdf, goToConfiguredYear,
    hasDatedEvents, isEntryModalOpen, isEntryReady, isExportingPdf,
    isSelectedDateInPast, meetingEvents, mode, monthIndex, moveBackward,
    moveForward, nextEvent, openMeetingComposer, selectedDateEvents,
    selectedDateKey, setActiveTab, setEntryColor, setEntryConfirmed,
    setEntryDone, setEntryLeadContact, setEntryLocation, setEntryNotes,
    setEntryRelatedMeeting, setEntryResponsible, setEntryTime, setEntryTitle,
    setEntryVirtualLink, setEntryWeeksBefore, setMode, todayKey,
    upcomingEvents, upcomingMeetingEvents, updateEntryCategory,
    updateEntryStatus, updateEntryType, year, selectDate, deleteCalendarEntry,
  };
}
