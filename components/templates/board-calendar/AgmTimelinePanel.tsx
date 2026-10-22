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
import { useAgmMilestoneFilters } from "./use-agm-milestone-filters";
import {
  Field,
  getNumber,
  getRows,
  getTopLevelString,
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
  const milestoneFilters = useAgmMilestoneFilters(milestones);
  const editingMilestone =
    editingMilestoneIndex === null || editingMilestoneIndex === "new"
      ? null
      : milestones[editingMilestoneIndex] ?? null;
  const activeMilestoneNumber =
    editingMilestoneIndex === "new"
      ? milestones.length + 1
      : (editingMilestoneIndex ?? 0) + 1;

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

  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-agm-timeline-panel"
    >
      <AgmTimelineHeader
        hasActiveFilters={milestoneFilters.hasActiveFilters}
        showFilters={showFilters}
        onAddMilestone={addMilestone}
        onToggleFilters={() => setShowFilters((current) => !current)}
      />
      <Field label="Confirmed AGM date">
        <Input
          aria-label="Confirmed AGM date"
          type="date"
          value={agmDate}
          onChange={(event) => updateAgmDate(event.target.value)}
        />
      </Field>
      <AgmTimelineFilters
        milestoneFilters={milestoneFilters}
        showFilters={showFilters}
      />
      <AgmMilestoneList
        filteredMilestones={milestoneFilters.filteredMilestones}
        hasMilestones={Boolean(milestones.length)}
        onEditMilestone={openMilestoneEditor}
        onRemoveMilestone={(index) =>
          onChange(["agm_milestones"], removeRow(milestones, index))
        }
      />
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

type AgmMilestoneFiltersController = ReturnType<typeof useAgmMilestoneFilters>;

function AgmTimelineHeader({
  hasActiveFilters,
  showFilters,
  onAddMilestone,
  onToggleFilters,
}: {
  hasActiveFilters: boolean;
  showFilters: boolean;
  onAddMilestone: () => void;
  onToggleFilters: () => void;
}) {
  return (
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
          onClick={onToggleFilters}
        >
          <Filter className="size-4" />
          Filters
          {hasActiveFilters ? (
            <Badge className="ml-1 bg-olea-green text-white">On</Badge>
          ) : null}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAddMilestone}>
          <Plus className="size-4" />
          Add milestone
        </Button>
      </div>
    </div>
  );
}

function AgmTimelineFilters({
  milestoneFilters,
  showFilters,
}: {
  milestoneFilters: AgmMilestoneFiltersController;
  showFilters: boolean;
}) {
  if (!showFilters) return null;

  return (
    <AgmMilestoneFilters
      doneFilter={milestoneFilters.filters.doneFilter}
      hasActiveFilters={milestoneFilters.hasActiveFilters}
      notesFilter={milestoneFilters.filters.notesFilter}
      responsibleFilter={milestoneFilters.filters.responsibleFilter}
      responsibleOptions={milestoneFilters.responsibleOptions}
      statusFilter={milestoneFilters.filters.statusFilter}
      targetFromFilter={milestoneFilters.filters.targetFromFilter}
      targetToFilter={milestoneFilters.filters.targetToFilter}
      taskFilter={milestoneFilters.filters.taskFilter}
      trackFilter={milestoneFilters.filters.trackFilter}
      onClearFilters={milestoneFilters.clearFilters}
      onDoneFilterChange={milestoneFilters.setDoneFilter}
      onNotesFilterChange={milestoneFilters.setNotesFilter}
      onResponsibleFilterChange={milestoneFilters.setResponsibleFilter}
      onStatusFilterChange={milestoneFilters.setStatusFilter}
      onTargetFromFilterChange={milestoneFilters.setTargetFromFilter}
      onTargetToFilterChange={milestoneFilters.setTargetToFilter}
      onTaskFilterChange={milestoneFilters.setTaskFilter}
      onTrackFilterChange={milestoneFilters.setTrackFilter}
    />
  );
}

function AgmMilestoneList({
  filteredMilestones,
  hasMilestones,
  onEditMilestone,
  onRemoveMilestone,
}: {
  filteredMilestones: AgmMilestoneFiltersController["filteredMilestones"];
  hasMilestones: boolean;
  onEditMilestone: (index: number) => void;
  onRemoveMilestone: (index: number) => void;
}) {
  if (!hasMilestones) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
        Add the confirmed AGM date, then add the first milestone for this
        planning timeline.
      </p>
    );
  }

  return (
    <>
      <AgmMilestoneTable
        milestones={filteredMilestones}
        onEditMilestone={onEditMilestone}
        onRemoveMilestone={onRemoveMilestone}
      />
      {!filteredMilestones.length ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No AGM milestones match the current filters.
        </p>
      ) : null}
    </>
  );
}
