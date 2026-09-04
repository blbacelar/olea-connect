"use client";

import { useEffect, useState } from "react";
import { Filter, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkspaceMemberDisplayName } from "@/lib/template-renderer/board-calendar-chairs";
import type {
  TemplateFormData,
  WorkspaceMemberOption,
} from "@/lib/template-renderer/types";

import { DirectoryEditorDialog } from "./DirectoryEditorDialog";
import { DirectoryFilters } from "./DirectoryFilters";
import { DirectoryTable } from "./DirectoryTable";
import {
  getRows,
  getString,
  includesFilterValue,
  matchesNoteFilter,
  removeRow,
  type TemplateRecord,
} from "./workflow-utils";

export function DirectoryTablePanel({
  data,
  onDataChange,
  workspaceMembers,
}: {
  data: TemplateFormData;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
  workspaceMembers: WorkspaceMemberOption[];
}) {
  const committees = getRows(data, "committees");
  const [editingCommitteeIndex, setEditingCommitteeIndex] = useState<number | null>(
    null,
  );
  const [committeeDraft, setCommitteeDraft] = useState<TemplateRecord | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [chairFilter, setChairFilter] = useState("");
  const [notesFilter, setNotesFilter] = useState("all");
  const editingCommittee =
    editingCommitteeIndex === null
      ? null
      : committees[editingCommitteeIndex] ?? null;
  const filteredCommittees = committees
    .map((committee, index) => ({ committee, index }))
    .filter(({ committee }) =>
      includesFilterValue(getString(committee, "name"), committeeFilter) &&
      includesFilterValue(getString(committee, "chair"), chairFilter) &&
      matchesNoteFilter(getString(committee, "notes"), notesFilter),
    );
  const hasActiveFilters = Boolean(
    committeeFilter || chairFilter || notesFilter !== "all",
  );

  useEffect(() => {
    if (editingCommitteeIndex === null) return;
    if (editingCommitteeIndex >= committees.length) return;
    if (!committees[editingCommitteeIndex]) {
      setEditingCommitteeIndex(null);
      setCommitteeDraft(null);
    }
  }, [committees, editingCommitteeIndex]);

  function openNewCommitteeEditor() {
    if (committees.length >= 8) return;
    setEditingCommitteeIndex(committees.length);
    setCommitteeDraft({ name: "", chair: "", chair_user_id: "", notes: "" });
  }

  function openCommitteeEditor(index: number) {
    setEditingCommitteeIndex(index);
    setCommitteeDraft({ ...(committees[index] ?? {}) });
  }

  function closeCommitteeEditor() {
    setEditingCommitteeIndex(null);
    setCommitteeDraft(null);
  }

  function updateCommitteeDraft(field: string, value: unknown) {
    setCommitteeDraft((current) => ({ ...(current ?? {}), [field]: value }));
  }

  function assignCommitteeDraftChair(member: WorkspaceMemberOption | null) {
    setCommitteeDraft((current) => ({
      ...(current ?? {}),
      chair: member ? getWorkspaceMemberDisplayName(member) : "",
      chair_user_id: member?.id ?? "",
    }));
  }

  function saveCommitteeDraft() {
    if (editingCommitteeIndex === null || !committeeDraft) return;
    onDataChange((currentData) => ({
      ...currentData,
      committees:
        editingCommitteeIndex >= getRows(currentData, "committees").length
          ? [...getRows(currentData, "committees"), committeeDraft]
          : getRows(currentData, "committees").map((committee, index) =>
              index === editingCommitteeIndex
                ? { ...committee, ...committeeDraft }
                : committee,
            ),
    }));
    closeCommitteeEditor();
  }

  function removeCommittee(index: number) {
    onDataChange((currentData) => ({
      ...currentData,
      committees: removeRow(getRows(currentData, "committees"), index),
    }));
  }

  function clearFilters() {
    setCommitteeFilter("");
    setChairFilter("");
    setNotesFilter("all");
  }

  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-directory-panel"
      aria-labelledby="board-calendar-directory-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="board-calendar-directory-heading"
            className="text-xl font-semibold text-slate-950"
          >
            Directory
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Maintain the board committees and primary contacts used throughout
            this calendar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showFilters}
            aria-controls="board-calendar-directory-filters"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter className="size-4" />
            Filters
            {hasActiveFilters ? (
              <Badge className="ml-1 bg-olea-green text-white">On</Badge>
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={committees.length >= 8}
            onClick={openNewCommitteeEditor}
          >
            <Plus className="size-4" />
            Add committee
          </Button>
        </div>
      </div>
      {showFilters ? (
        <DirectoryFilters
          chairFilter={chairFilter}
          committeeFilter={committeeFilter}
          hasActiveFilters={hasActiveFilters}
          notesFilter={notesFilter}
          onChairFilterChange={setChairFilter}
          onClearFilters={clearFilters}
          onCommitteeFilterChange={setCommitteeFilter}
          onNotesFilterChange={setNotesFilter}
        />
      ) : null}
      {committees.length ? (
        <>
          <DirectoryTable
            committees={filteredCommittees}
            onEditCommittee={openCommitteeEditor}
            onRemoveCommittee={removeCommittee}
          />
          {!filteredCommittees.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              No directory entries match the current filters.
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No committees yet. Add one when this board uses committees or named
          working groups.
        </p>
      )}
      <DirectoryEditorDialog
        committeeDraft={committeeDraft}
        editingCommittee={editingCommittee}
        editingCommitteeIndex={editingCommitteeIndex}
        workspaceMembers={workspaceMembers}
        onAssignChair={assignCommitteeDraftChair}
        onClose={closeCommitteeEditor}
        onSave={saveCommitteeDraft}
        onUpdateDraft={updateCommitteeDraft}
      />
    </section>
  );
}
