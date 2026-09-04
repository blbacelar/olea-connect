"use client";

import { useEffect, useState } from "react";
import { Filter, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildBoardCalendarSetup,
  calculateAgmMilestoneDate,
} from "@/lib/template-renderer/board-calendar-editor";
import type {
  FieldPath,
  TemplateFormData,
  TemplateValue,
} from "@/lib/template-renderer/types";

import { AgmMilestoneDialog } from "./AgmMilestoneDialog";
import { AgmMilestoneFilters } from "./AgmMilestoneFilters";
import { AgmMilestoneTable } from "./AgmMilestoneTable";
import {
  Field,
  getNumber,
  getRows,
  getString,
  getTopLevelString,
  includesFilterValue,
  matchesNoteFilter,
  removeRow,
  type TemplateRecord,
} from "./workflow-utils";

export function AgmTimelinePanel({
  data,
  onChange,
}: {
  data: TemplateFormData;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const setup = buildBoardCalendarSetup(data);
  const agmDate = getTopLevelString(data, "agm_date");
  const milestones = getRows(data, "agm_milestones");
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<
    number | "new" | null
  >(null);
  const [milestoneDraft, setMilestoneDraft] = useState<TemplateRecord | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [taskFilter, setTaskFilter] = useState("");
  const [targetFromFilter, setTargetFromFilter] = useState("");
  const [targetToFilter, setTargetToFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesFilter, setNotesFilter] = useState("all");
  const [doneFilter, setDoneFilter] = useState("all");
  const editingMilestone =
    editingMilestoneIndex === null || editingMilestoneIndex === "new"
      ? null
      : milestones[editingMilestoneIndex] ?? null;
  const activeMilestoneNumber =
    editingMilestoneIndex === "new"
      ? milestones.length + 1
      : (editingMilestoneIndex ?? 0) + 1;
  const responsibleOptions = Array.from(
    new Set(
      milestones
        .map((milestone) => getString(milestone, "responsible"))
        .filter(Boolean),
    ),
  );
  const filteredMilestones = milestones
    .map((milestone, index) => ({ milestone, index }))
    .filter(({ milestone }) =>
      matchesMilestoneFilters(milestone, {
        doneFilter,
        notesFilter,
        responsibleFilter,
        statusFilter,
        targetFromFilter,
        targetToFilter,
        taskFilter,
        trackFilter,
      }),
    );
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

  useEffect(() => {
    if (editingMilestoneIndex === null || editingMilestoneIndex === "new") return;
    if (!milestones[editingMilestoneIndex]) {
      setEditingMilestoneIndex(null);
      setMilestoneDraft(null);
    }
  }, [editingMilestoneIndex, milestones]);

  function updateAgmDate(value: string) {
    onChange(["agm_date"], value);
    onChange(
      ["agm_milestones"],
      milestones.map((milestone) => {
        const daysBefore = getNumber(milestone, "days_before");
        return {
          ...milestone,
          calculated_date: calculateAgmMilestoneDate(value, daysBefore),
        };
      }),
    );
  }

  function addMilestone() {
    const daysBefore = 30;
    setEditingMilestoneIndex("new");
    setMilestoneDraft({
      track: "Governance",
      task: "",
      days_before: daysBefore,
      calculated_date: calculateAgmMilestoneDate(agmDate, daysBefore),
      responsible: "Administrator",
      status: "Not Started",
      notes: "",
      done: false,
    });
  }

  function openMilestoneEditor(index: number) {
    setEditingMilestoneIndex(index);
    setMilestoneDraft({ ...(milestones[index] ?? {}) });
  }

  function closeMilestoneEditor() {
    setEditingMilestoneIndex(null);
    setMilestoneDraft(null);
  }

  function updateMilestoneDraft(field: string, value: unknown) {
    setMilestoneDraft((current) => {
      const nextDraft = { ...(current ?? {}), [field]: value };
      if (field === "days_before" || field === "task") {
        nextDraft.calculated_date = calculateAgmMilestoneDate(
          agmDate,
          getNumber(nextDraft, "days_before"),
        );
      }
      return nextDraft;
    });
  }

  function saveMilestoneDraft() {
    if (editingMilestoneIndex === null || !milestoneDraft) return;
    const daysBefore = getNumber(milestoneDraft, "days_before");
    const normalizedDraft = {
      ...milestoneDraft,
      days_before: daysBefore,
      calculated_date: calculateAgmMilestoneDate(agmDate, daysBefore),
    };

    onChange(
      ["agm_milestones"],
      editingMilestoneIndex === "new"
        ? [...milestones, normalizedDraft]
        : milestones.map((milestone, index) =>
            index === editingMilestoneIndex
              ? { ...milestone, ...normalizedDraft }
              : milestone,
          ),
    );
    closeMilestoneEditor();
  }

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

  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-agm-timeline-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">
            AGM planning timeline
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add milestones one at a time. Target dates are calculated from the
            confirmed AGM date and days before AGM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showFilters}
            aria-controls="board-calendar-agm-filters"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter className="size-4" />
            Filters
            {hasActiveFilters ? (
              <Badge className="ml-1 bg-olea-green text-white">On</Badge>
            ) : null}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
            <Plus className="size-4" />
            Add milestone
          </Button>
        </div>
      </div>
      <Field label="Confirmed AGM date">
        <Input
          aria-label="Confirmed AGM date"
          type="date"
          value={agmDate}
          onChange={(event) => updateAgmDate(event.target.value)}
        />
      </Field>
      {showFilters ? (
        <AgmMilestoneFilters
          doneFilter={doneFilter}
          hasActiveFilters={hasActiveFilters}
          notesFilter={notesFilter}
          responsibleFilter={responsibleFilter}
          responsibleOptions={responsibleOptions}
          statusFilter={statusFilter}
          targetFromFilter={targetFromFilter}
          targetToFilter={targetToFilter}
          taskFilter={taskFilter}
          trackFilter={trackFilter}
          onClearFilters={clearFilters}
          onDoneFilterChange={setDoneFilter}
          onNotesFilterChange={setNotesFilter}
          onResponsibleFilterChange={setResponsibleFilter}
          onStatusFilterChange={setStatusFilter}
          onTargetFromFilterChange={setTargetFromFilter}
          onTargetToFilterChange={setTargetToFilter}
          onTaskFilterChange={setTaskFilter}
          onTrackFilterChange={setTrackFilter}
        />
      ) : null}
      {milestones.length ? (
        <>
          <AgmMilestoneTable
            milestones={filteredMilestones}
            onEditMilestone={openMilestoneEditor}
            onRemoveMilestone={(index) =>
              onChange(["agm_milestones"], removeRow(milestones, index))
            }
          />
          {!filteredMilestones.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              No AGM milestones match the current filters.
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          Add the confirmed AGM date, then add the first milestone for this
          planning timeline.
        </p>
      )}
      <AgmMilestoneDialog
        activeMilestoneNumber={activeMilestoneNumber}
        editingMilestone={editingMilestone}
        editingMilestoneIndex={editingMilestoneIndex}
        milestoneDraft={milestoneDraft}
        responsibleOptions={setup.responsibleOptions}
        onClose={closeMilestoneEditor}
        onSave={saveMilestoneDraft}
        onUpdateDraft={updateMilestoneDraft}
      />
    </section>
  );
}

function matchesMilestoneFilters(
  milestone: TemplateRecord,
  filters: {
    doneFilter: string;
    notesFilter: string;
    responsibleFilter: string;
    statusFilter: string;
    targetFromFilter: string;
    targetToFilter: string;
    taskFilter: string;
    trackFilter: string;
  },
) {
  const targetDate = getString(milestone, "calculated_date");
  const done = Boolean(milestone.done);
  return (
    includesFilterValue(getString(milestone, "task"), filters.taskFilter) &&
    (!filters.targetFromFilter || targetDate >= filters.targetFromFilter) &&
    (!filters.targetToFilter || targetDate <= filters.targetToFilter) &&
    (filters.trackFilter === "all" ||
      (getString(milestone, "track") || "Governance") === filters.trackFilter) &&
    (filters.responsibleFilter === "all" ||
      getString(milestone, "responsible") === filters.responsibleFilter) &&
    (filters.statusFilter === "all" ||
      (getString(milestone, "status") || "Not Started") ===
        filters.statusFilter) &&
    (filters.doneFilter === "all" ||
      (filters.doneFilter === "done" ? done : !done)) &&
    matchesNoteFilter(getString(milestone, "notes"), filters.notesFilter)
  );
}
