import { useState } from "react";

import {
  getString,
  includesFilterValue,
  matchesNoteFilter,
  type TemplateRecord,
} from "./workflow-utils";

type StaffTaskFilterState = {
  dueFromFilter: string;
  dueToFilter: string;
  notesFilter: string;
  relatedMeetingFilter: string;
  responsibleFilter: string;
  statusFilter: string;
  taskFilter: string;
};

export function useStaffTaskFilters(tasks: TemplateRecord[]) {
  const [taskFilter, setTaskFilter] = useState("");
  const [dueFromFilter, setDueFromFilter] = useState("");
  const [dueToFilter, setDueToFilter] = useState("");
  const [relatedMeetingFilter, setRelatedMeetingFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesFilter, setNotesFilter] = useState("all");
  const filters = {
    dueFromFilter,
    dueToFilter,
    notesFilter,
    relatedMeetingFilter,
    responsibleFilter,
    statusFilter,
    taskFilter,
  };
  const responsibleOptions = Array.from(
    new Set(tasks.map((task) => getString(task, "responsible")).filter(Boolean)),
  );
  const filteredTasks = tasks
    .map((task, index) => ({ index, task }))
    .filter(({ task }) => matchesStaffTaskFilters(task, filters));
  const hasActiveFilters = Boolean(
    taskFilter ||
      dueFromFilter ||
      dueToFilter ||
      relatedMeetingFilter ||
      responsibleFilter !== "all" ||
      statusFilter !== "all" ||
      notesFilter !== "all",
  );

  function clearFilters() {
    setTaskFilter("");
    setDueFromFilter("");
    setDueToFilter("");
    setRelatedMeetingFilter("");
    setResponsibleFilter("all");
    setStatusFilter("all");
    setNotesFilter("all");
  }

  return {
    clearFilters,
    filteredTasks,
    filters,
    hasActiveFilters,
    responsibleOptions,
    setDueFromFilter,
    setDueToFilter,
    setNotesFilter,
    setRelatedMeetingFilter,
    setResponsibleFilter,
    setStatusFilter,
    setTaskFilter,
  };
}

function matchesStaffTaskFilters(
  task: TemplateRecord,
  filters: StaffTaskFilterState,
) {
  const dueDate = getString(task, "due_date");
  const notes = getString(task, "notes");

  return [
    includesFilterValue(getString(task, "task"), filters.taskFilter),
    includesFilterValue(
      getString(task, "related_meeting"),
      filters.relatedMeetingFilter,
    ),
    matchesFromDate(dueDate, filters.dueFromFilter),
    matchesToDate(dueDate, filters.dueToFilter),
    matchesResponsible(task, filters.responsibleFilter),
    matchesStatus(task, filters.statusFilter),
    matchesNoteFilter(notes, filters.notesFilter),
  ].every(Boolean);
}

function matchesFromDate(dueDate: string, filterValue: string) {
  return !filterValue || dueDate >= filterValue;
}

function matchesToDate(dueDate: string, filterValue: string) {
  return !filterValue || dueDate <= filterValue;
}

function matchesResponsible(task: TemplateRecord, filterValue: string) {
  return filterValue === "all" || getString(task, "responsible") === filterValue;
}

function matchesStatus(task: TemplateRecord, filterValue: string) {
  return (
    filterValue === "all" ||
    (getString(task, "status") || "Not Started") === filterValue
  );
}
