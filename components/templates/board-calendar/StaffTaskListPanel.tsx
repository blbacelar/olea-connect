"use client";

import { useEffect, useState } from "react";
import { Filter, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildBoardCalendarSetup,
  syncBoardCalendarGeneratedTasks,
} from "@/lib/template-renderer/board-calendar-editor";
import type {
  FieldPath,
  TemplateFormData,
  TemplateValue,
} from "@/lib/template-renderer/types";

import {
  getRows,
  getString,
  StatusBadge,
  type TemplateRecord,
} from "./workflow-utils";
import { StaffTaskEditorDialog } from "./StaffTaskEditorDialog";
import { StaffTaskFilters } from "./StaffTaskFilters";
import { useStaffTaskFilters } from "./use-staff-task-filters";

export function StaffTaskListPanel({
  data,
  onChange,
}: {
  data: TemplateFormData;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const setup = buildBoardCalendarSetup(data);
  const tasks = getRows(syncBoardCalendarGeneratedTasks(data), "tasks");
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskDraft, setTaskDraft] = useState<TemplateRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const taskFilters = useStaffTaskFilters(tasks);
  const editingTask =
    editingTaskIndex === null ? null : tasks[editingTaskIndex] ?? null;

  useEffect(() => {
    if (editingTaskIndex === null) return;
    if (!tasks[editingTaskIndex]) {
      setEditingTaskIndex(null);
      setTaskDraft(null);
    }
  }, [editingTaskIndex, tasks]);

  function openTaskEditor(index: number) {
    setEditingTaskIndex(index);
    setTaskDraft({ ...(tasks[index] ?? {}) });
  }

  function closeTaskEditor() {
    setEditingTaskIndex(null);
    setTaskDraft(null);
  }

  function updateTaskDraft(field: string, value: unknown) {
    setTaskDraft((current) => ({ ...(current ?? {}), [field]: value }));
  }

  function saveTaskDraft() {
    if (editingTaskIndex === null || !taskDraft) return;
    onChange(
      ["tasks"],
      tasks.map((task, index) =>
        index === editingTaskIndex ? { ...task, ...taskDraft } : task,
      ),
    );
    closeTaskEditor();
  }

  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-staff-task-list-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">
            Staff task list
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Generated from Meeting Schedule and Setup task rules. Update owner,
            status, and notes here; generated due dates stay connected.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={showFilters}
          aria-controls="board-calendar-workflow-filters"
          onClick={() => setShowFilters((current) => !current)}
        >
          <Filter className="size-4" />
          Filters
          {taskFilters.hasActiveFilters ? (
            <Badge className="ml-1 bg-olea-green text-white">On</Badge>
          ) : null}
        </Button>
      </div>
      {showFilters ? (
        <StaffTaskFilters
          dueFromFilter={taskFilters.filters.dueFromFilter}
          dueToFilter={taskFilters.filters.dueToFilter}
          hasActiveFilters={taskFilters.hasActiveFilters}
          notesFilter={taskFilters.filters.notesFilter}
          relatedMeetingFilter={taskFilters.filters.relatedMeetingFilter}
          responsibleFilter={taskFilters.filters.responsibleFilter}
          responsibleOptions={taskFilters.responsibleOptions}
          statusFilter={taskFilters.filters.statusFilter}
          taskFilter={taskFilters.filters.taskFilter}
          onClearFilters={taskFilters.clearFilters}
          onDueFromFilterChange={taskFilters.setDueFromFilter}
          onDueToFilterChange={taskFilters.setDueToFilter}
          onNotesFilterChange={taskFilters.setNotesFilter}
          onRelatedMeetingFilterChange={taskFilters.setRelatedMeetingFilter}
          onResponsibleFilterChange={taskFilters.setResponsibleFilter}
          onStatusFilterChange={taskFilters.setStatusFilter}
          onTaskFilterChange={taskFilters.setTaskFilter}
        />
      ) : null}
      {tasks.length ? (
        <>
          <StaffTaskTable
            tasks={taskFilters.filteredTasks}
            onEditTask={openTaskEditor}
          />
          {!taskFilters.filteredTasks.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              No workflow tasks match the current filters.
            </p>
          ) : null}
          <StaffTaskEditorDialog
            editingTask={editingTask}
            editingTaskIndex={editingTaskIndex}
            responsibleOptions={setup.responsibleOptions}
            taskDraft={taskDraft}
            onClose={closeTaskEditor}
            onSave={saveTaskDraft}
            onUpdateDraft={updateTaskDraft}
          />
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          Add meetings and task rules in Setup to generate staff tasks.
        </p>
      )}
    </section>
  );
}

function StaffTaskTable({
  tasks,
  onEditTask,
}: {
  tasks: Array<{ index: number; task: TemplateRecord }>;
  onEditTask: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Related meeting</TableHead>
            <TableHead>Responsible</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Notes</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(({ task, index }) => (
            <TableRow key={getString(task, "generated_key") || `manual-task-${index}`}>
              <TableCell className="min-w-[220px] font-semibold text-slate-950">
                {getString(task, "task") || "Untitled task"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-700">
                {getString(task, "due_date") || "No due date"}
              </TableCell>
              <TableCell className="min-w-[180px] text-slate-600">
                {getString(task, "related_meeting") || "Calendar task"}
              </TableCell>
              <TableCell className="min-w-[160px] text-slate-700">
                {getString(task, "responsible") || "Unassigned"}
              </TableCell>
              <TableCell>
                <StatusBadge status={getString(task, "status")} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-500">
                {getString(task, "notes") ? (
                  <Badge
                    variant="outline"
                    className="border-olea-green/20 bg-olea-light text-olea-dark"
                  >
                    Has notes
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Edit task ${index + 1}`}
                  onClick={() => onEditTask(index)}
                >
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
