import { useState } from "react";

import {
  getString,
  includesFilterValue,
  matchesNoteFilter,
  type TemplateRecord,
} from "./workflow-utils";

export type AgmMilestoneFilterState = {
  doneFilter: string;
  notesFilter: string;
  responsibleFilter: string;
  statusFilter: string;
  targetFromFilter: string;
  targetToFilter: string;
  taskFilter: string;
  trackFilter: string;
};

export function useAgmMilestoneFilters(milestones: TemplateRecord[]) {
  const [taskFilter, setTaskFilter] = useState("");
  const [targetFromFilter, setTargetFromFilter] = useState("");
  const [targetToFilter, setTargetToFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesFilter, setNotesFilter] = useState("all");
  const [doneFilter, setDoneFilter] = useState("all");
  const filters = {
    doneFilter,
    notesFilter,
    responsibleFilter,
    statusFilter,
    targetFromFilter,
    targetToFilter,
    taskFilter,
    trackFilter,
  };
  const responsibleOptions = Array.from(
    new Set(
      milestones
        .map((milestone) => getString(milestone, "responsible"))
        .filter(Boolean),
    ),
  );
  const filteredMilestones = milestones
    .map((milestone, index) => ({ milestone, index }))
    .filter(({ milestone }) => matchesMilestoneFilters(milestone, filters));
  const hasActiveFilters = Boolean(
    taskFilter ||
      targetFromFilter ||
      targetToFilter ||
      trackFilter !== "all" ||
      responsibleFilter !== "all" ||
      statusFilter !== "all" ||
      notesFilter !== "all" ||
      doneFilter !== "all",
  );

  function clearFilters() {
    setTaskFilter("");
    setTargetFromFilter("");
    setTargetToFilter("");
    setTrackFilter("all");
    setResponsibleFilter("all");
    setStatusFilter("all");
    setNotesFilter("all");
    setDoneFilter("all");
  }

  return {
    clearFilters,
    filteredMilestones,
    filters,
    hasActiveFilters,
    responsibleOptions,
    setDoneFilter,
    setNotesFilter,
    setResponsibleFilter,
    setStatusFilter,
    setTargetFromFilter,
    setTargetToFilter,
    setTaskFilter,
    setTrackFilter,
  };
}

function matchesMilestoneFilters(
  milestone: TemplateRecord,
  filters: AgmMilestoneFilterState,
) {
  const targetDate = getString(milestone, "calculated_date");
  const done = Boolean(milestone.done);

  return [
    includesFilterValue(getString(milestone, "task"), filters.taskFilter),
    matchesFromDate(targetDate, filters.targetFromFilter),
    matchesToDate(targetDate, filters.targetToFilter),
    matchesTrack(milestone, filters.trackFilter),
    matchesResponsible(milestone, filters.responsibleFilter),
    matchesStatus(milestone, filters.statusFilter),
    matchesDone(done, filters.doneFilter),
    matchesNoteFilter(getString(milestone, "notes"), filters.notesFilter),
  ].every(Boolean);
}

function matchesFromDate(targetDate: string, filterValue: string) {
  return !filterValue || targetDate >= filterValue;
}

function matchesToDate(targetDate: string, filterValue: string) {
  return !filterValue || targetDate <= filterValue;
}

function matchesTrack(milestone: TemplateRecord, filterValue: string) {
  return (
    filterValue === "all" ||
    (getString(milestone, "track") || "Governance") === filterValue
  );
}

function matchesResponsible(milestone: TemplateRecord, filterValue: string) {
  return (
    filterValue === "all" ||
    getString(milestone, "responsible") === filterValue
  );
}

function matchesStatus(milestone: TemplateRecord, filterValue: string) {
  return (
    filterValue === "all" ||
    (getString(milestone, "status") || "Not Started") === filterValue
  );
}

function matchesDone(done: boolean, filterValue: string) {
  return filterValue === "all" || (filterValue === "done" ? done : !done);
}
