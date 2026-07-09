"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Filter, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  buildBoardCalendarSetup,
  calculateAgmMilestoneDate,
  syncBoardCalendarGeneratedTasks,
} from "@/lib/template-renderer/board-calendar-editor";
import { setValue } from "@/lib/template-renderer/schema";
import type {
  FieldPath,
  TemplateFormData,
  TemplateValue,
} from "@/lib/template-renderer/types";

type TemplateRecord = Record<string, unknown>;

const statusOptions = ["Not Started", "In Progress", "Complete", "Blocked"];
const trackOptions = [
  "Governance",
  "Finance",
  "Communications",
  "Operations",
  "Other",
];

const noteFilterOptions = [
  { label: "All notes", value: "all" },
  { label: "Has notes", value: "with_notes" },
  { label: "No notes", value: "without_notes" },
];

function isRecord(value: unknown): value is TemplateRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRows(data: TemplateFormData, key: string): TemplateRecord[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(isRecord);
}

function getString(record: TemplateRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function getNumber(record: TemplateRecord, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getTopLevelString(data: TemplateFormData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase();
}

function includesFilterValue(value: string, filter: string) {
  const normalizedFilter = normalizeFilterValue(filter);
  return (
    !normalizedFilter ||
    value.toLowerCase().includes(normalizedFilter)
  );
}

function matchesNoteFilter(notes: string, filter: string) {
  if (filter === "with_notes") return Boolean(notes.trim());
  if (filter === "without_notes") return !notes.trim();
  return true;
}

function updateRow(
  rows: TemplateRecord[],
  index: number,
  field: string,
  value: unknown,
) {
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, [field]: value } : row,
  );
}

function removeRow(rows: TemplateRecord[], index: number) {
  return rows.filter((_, rowIndex) => rowIndex !== index);
}

function getCommitteeRowKey(committee: TemplateRecord, index: number) {
  const name = getString(committee, "name").trim();
  const chair = getString(committee, "chair").trim();
  const notes = getString(committee, "notes").trim();
  return [name, chair, notes].some(Boolean)
    ? `committee-${name}-${chair}-${notes}`
    : `committee-empty-${index}`;
}

function getAgmMilestoneRowKey(milestone: TemplateRecord, index: number) {
  const task = getString(milestone, "task").trim();
  const targetDate = getString(milestone, "calculated_date").trim();
  const track = getString(milestone, "track").trim();
  return [task, targetDate, track].some(Boolean)
    ? `agm-${task}-${targetDate}-${track}-${index}`
    : `agm-empty-${index}`;
}

export function BoardCalendarSetupPanel({
  data,
  onChange,
  onDataChange,
}: {
  data: TemplateFormData;
  onChange: (path: FieldPath, value: TemplateValue) => void;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
}) {
  const setup = buildBoardCalendarSetup(data);
  const committees = getRows(data, "committees");
  const taskRules = getRows(data, "operational_task_rules");

  function updateTopLevel(key: string, value: string) {
    onChange([key], value);
  }

  function updateCommittee(index: number, field: string, value: string) {
    onDataChange((currentData) => ({
      ...currentData,
      committees: updateRow(getRows(currentData, "committees"), index, field, value),
    }));
  }

  function addCommittee() {
    if (committees.length >= 8) return;
    onDataChange((currentData) => {
      const currentCommittees = getRows(currentData, "committees");
      if (currentCommittees.length >= 8) return currentData;
      return {
        ...currentData,
        committees: [
          ...currentCommittees,
          { name: "", chair: "", notes: "" },
        ],
      };
    });
  }

  function removeCommittee(index: number) {
    onDataChange((currentData) => ({
      ...currentData,
      committees: removeRow(getRows(currentData, "committees"), index),
    }));
  }

  function updateTaskRule(index: number, field: string, value: unknown) {
    updateTaskRulesFromCurrent((currentRules) =>
      updateRow(currentRules, index, field, value),
    );
  }

  function updateTaskRuleTiming(index: number, timing: "after" | "before") {
    updateTaskRulesFromCurrent((currentRules) => {
      const currentRule = currentRules[index];
      const currentDays =
        getNumber(currentRule, "days_after") ||
        getNumber(currentRule, "days_before");

      return currentRules.map((rule, ruleIndex) =>
        ruleIndex === index
          ? {
              ...rule,
              days_after: timing === "after" ? currentDays : 0,
              days_before: timing === "before" ? currentDays : 0,
            }
          : rule,
      );
    });
  }

  function updateTaskRules(nextRules: TemplateRecord[]) {
    onDataChange((currentData) =>
      syncBoardCalendarGeneratedTasks(
        setValue(currentData, ["operational_task_rules"], nextRules),
      ),
    );
  }

  function updateTaskRulesFromCurrent(
    updater: (currentRules: TemplateRecord[]) => TemplateRecord[],
  ) {
    onDataChange((currentData) =>
      syncBoardCalendarGeneratedTasks(
        setValue(
          currentData,
          ["operational_task_rules"],
          updater(getRows(currentData, "operational_task_rules")),
        ),
      ),
    );
  }

  function addTaskRule() {
    updateTaskRules([
      ...taskRules,
      {
        label: "",
        days_before: 14,
        applies_to: "Any meeting",
        responsible: "Administrator",
      },
    ]);
  }

  return (
    <section
      className="space-y-6 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-setup-panel"
    >
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Setup</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Configure this workbook once. Meetings generate the calendar and staff
          work from these setup rules.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Organization name">
          <Input
            aria-label="Organization name"
            value={getTopLevelString(data, "organization_name")}
            placeholder="Your organization"
            onChange={(event) => updateTopLevel("organization_name", event.target.value)}
          />
        </Field>
        <Field label="Fiscal year">
          <Input
            aria-label="Fiscal year"
            value={setup.fiscalYear}
            placeholder="2026"
            onChange={(event) => updateTopLevel("fiscal_year", event.target.value)}
          />
        </Field>
        <Field label="Administrator">
          <Input
            aria-label="Administrator"
            value={setup.administrator}
            onChange={(event) => updateTopLevel("administrator", event.target.value)}
          />
        </Field>
        <Field label="Administrator email">
          <Input
            aria-label="Administrator email"
            type="email"
            value={setup.administratorEmail}
            onChange={(event) =>
              updateTopLevel("administrator_email", event.target.value)
            }
          />
        </Field>
        <Field label="Executive Director">
          <Input
            aria-label="Executive Director"
            value={setup.executiveDirector}
            onChange={(event) =>
              updateTopLevel("executive_director", event.target.value)
            }
          />
        </Field>
        <Field label="Board Chair">
          <Input
            aria-label="Board Chair"
            value={setup.boardChair}
            onChange={(event) => updateTopLevel("board_chair", event.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-slate-950">Committees</h4>
            <p className="text-sm text-slate-500">
              Add only the committees you need, up to 8.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={committees.length >= 8}
            onClick={addCommittee}
          >
            <Plus className="size-4" />
            Add committee
          </Button>
        </div>
        <div className="space-y-3">
          {committees.map((committee, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                aria-label={`Committee ${index + 1} name`}
                placeholder="Committee name"
                value={getString(committee, "name")}
                onChange={(event) =>
                  updateCommittee(index, "name", event.target.value)
                }
              />
              <Input
                aria-label={`Committee ${index + 1} chair`}
                placeholder="Committee chair"
                value={getString(committee, "chair")}
                onChange={(event) =>
                  updateCommittee(index, "chair", event.target.value)
                }
              />
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => removeCommittee(index)}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          ))}
          {!committees.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              No committees yet. Add one only if this board uses committees.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-slate-950">
              Operational task rules
            </h4>
            <p className="text-sm text-slate-500">
              These rules generate the staff task list from every matching
              meeting.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTaskRule}>
            <Plus className="size-4" />
            Add task rule
          </Button>
        </div>
        <div className="space-y-3">
          {taskRules.map((rule, index) => {
            const isAfter = getNumber(rule, "days_after") > 0;
            return (
              <div
                key={index}
                className="grid gap-3 rounded-xl border bg-slate-50 p-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr_1fr_1fr_auto]"
              >
                <Input
                  aria-label={`Task rule ${index + 1} label`}
                  placeholder="Send save-the-date"
                  value={getString(rule, "label") || getString(rule, "task")}
                  onChange={(event) =>
                    updateTaskRule(index, "label", event.target.value)
                  }
                />
                <Input
                  aria-label={`Task rule ${index + 1} days`}
                  type="number"
                  value={String(
                    isAfter
                      ? getNumber(rule, "days_after")
                      : getNumber(rule, "days_before"),
                  )}
                  onChange={(event) =>
                    updateTaskRule(
                      index,
                      isAfter ? "days_after" : "days_before",
                      Number(event.target.value),
                    )
                  }
                />
                <Select
                  value={isAfter ? "after" : "before"}
                  onValueChange={(value) =>
                    updateTaskRuleTiming(index, value as "after" | "before")
                  }
                >
                  <SelectTrigger aria-label={`Task rule ${index + 1} timing`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={getString(rule, "applies_to") || "Any meeting"}
                  onValueChange={(value) =>
                    updateTaskRule(index, "applies_to", value)
                  }
                >
                  <SelectTrigger aria-label={`Task rule ${index + 1} applies to`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any meeting">Any meeting</SelectItem>
                    <SelectItem value="Board Meeting">Board Meeting</SelectItem>
                    <SelectItem value="Committee Meeting">
                      Committee Meeting
                    </SelectItem>
                    <SelectItem value="AGM / Annual Meeting">
                      AGM / Annual Meeting
                    </SelectItem>
                  </SelectContent>
                </Select>
                <ResponsibleSelect
                  label={`Task rule ${index + 1} responsible`}
                  options={setup.responsibleOptions}
                  value={getString(rule, "responsible") || "Administrator"}
                  onChange={(value) => updateTaskRule(index, "responsible", value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => updateTaskRules(removeRow(taskRules, index))}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
  const [taskFilter, setTaskFilter] = useState("");
  const [dueFromFilter, setDueFromFilter] = useState("");
  const [dueToFilter, setDueToFilter] = useState("");
  const [relatedMeetingFilter, setRelatedMeetingFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesFilter, setNotesFilter] = useState("all");
  const editingTask =
    editingTaskIndex === null ? null : tasks[editingTaskIndex] ?? null;
  const responsibleOptions = Array.from(
    new Set(
      tasks
        .map((task) => getString(task, "responsible"))
        .filter(Boolean),
    ),
  );
  const filteredTasks = tasks
    .map((task, index) => ({ index, task }))
    .filter(({ task }) => {
      const dueDate = getString(task, "due_date");
      const notes = getString(task, "notes");

      return (
        includesFilterValue(getString(task, "task"), taskFilter) &&
        includesFilterValue(
          getString(task, "related_meeting"),
          relatedMeetingFilter,
        ) &&
        (!dueFromFilter || dueDate >= dueFromFilter) &&
        (!dueToFilter || dueDate <= dueToFilter) &&
        (responsibleFilter === "all" ||
          getString(task, "responsible") === responsibleFilter) &&
        (statusFilter === "all" ||
          (getString(task, "status") || "Not Started") === statusFilter) &&
        matchesNoteFilter(notes, notesFilter)
      );
    });
  const hasActiveFilters = Boolean(
    taskFilter ||
      dueFromFilter ||
      dueToFilter ||
      relatedMeetingFilter ||
      responsibleFilter !== "all" ||
      statusFilter !== "all" ||
      notesFilter !== "all",
  );

  useEffect(() => {
    if (editingTaskIndex === null) return;
    const nextTask = tasks[editingTaskIndex];
    if (!nextTask) {
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

  function clearFilters() {
    setTaskFilter("");
    setDueFromFilter("");
    setDueToFilter("");
    setRelatedMeetingFilter("");
    setResponsibleFilter("all");
    setStatusFilter("all");
    setNotesFilter("all");
  }

  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-staff-task-list-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Staff task list</h3>
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
          {hasActiveFilters ? (
            <Badge className="ml-1 bg-olea-green text-white">On</Badge>
          ) : null}
        </Button>
      </div>

      {showFilters ? (
        <div
          id="board-calendar-workflow-filters"
          className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Task">
            <Input
              aria-label="Filter workflow tasks by task"
              value={taskFilter}
              placeholder="Task name"
              onChange={(event) => setTaskFilter(event.target.value)}
            />
          </Field>
          <Field label="Related meeting">
            <Input
              aria-label="Filter workflow tasks by related meeting"
              value={relatedMeetingFilter}
              placeholder="Meeting name"
              onChange={(event) => setRelatedMeetingFilter(event.target.value)}
            />
          </Field>
          <Field label="Due from">
            <Input
              aria-label="Filter workflow tasks due from"
              type="date"
              value={dueFromFilter}
              onChange={(event) => setDueFromFilter(event.target.value)}
            />
          </Field>
          <Field label="Due to">
            <Input
              aria-label="Filter workflow tasks due to"
              type="date"
              value={dueToFilter}
              onChange={(event) => setDueToFilter(event.target.value)}
            />
          </Field>
          <Field label="Responsible">
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger aria-label="Filter workflow tasks by responsible">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All responsible</SelectItem>
                {responsibleOptions.map((responsible) => (
                  <SelectItem key={responsible} value={responsible}>
                    {responsible}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter workflow tasks by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Select value={notesFilter} onValueChange={setNotesFilter}>
              <SelectTrigger aria-label="Filter workflow tasks by notes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {noteFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        </div>
      ) : null}

      {tasks.length ? (
        <>
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
                {filteredTasks.map(({ task, index }) => (
                  <TableRow
                    key={getString(task, "generated_key") || `manual-task-${index}`}
                  >
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
                        onClick={() => openTaskEditor(index)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!filteredTasks.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              No workflow tasks match the current filters.
            </p>
          ) : null}

          <Dialog
            open={editingTaskIndex !== null}
            onOpenChange={(open) => {
              if (!open) closeTaskEditor();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit workflow task</DialogTitle>
                <DialogDescription>
                  Update the owner, status, and notes for this generated task.
                  The due date stays tied to the meeting and setup rule.
                </DialogDescription>
              </DialogHeader>
              {taskDraft && editingTask ? (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Task
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {getString(taskDraft, "task") || "Untitled task"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Due {getString(taskDraft, "due_date") || "without date"} ·{" "}
                      {getString(taskDraft, "related_meeting") || "Calendar task"}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Responsible">
                      <ResponsibleSelect
                        label={`Task ${(editingTaskIndex ?? 0) + 1} responsible`}
                        options={setup.responsibleOptions}
                        value={getString(taskDraft, "responsible")}
                        onChange={(value) => updateTaskDraft("responsible", value)}
                      />
                    </Field>
                    <Field label="Status">
                      <Select
                        value={getString(taskDraft, "status") || "Not Started"}
                        onValueChange={(value) => updateTaskDraft("status", value)}
                      >
                        <SelectTrigger
                          aria-label={`Task ${(editingTaskIndex ?? 0) + 1} status`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Notes">
                    <Textarea
                      aria-label={`Task ${(editingTaskIndex ?? 0) + 1} notes`}
                      placeholder="Notes"
                      value={getString(taskDraft, "notes")}
                      onChange={(event) =>
                        updateTaskDraft("notes", event.target.value)
                      }
                    />
                  </Field>
                </div>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={saveTaskDraft}>
                  Save task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          Add meetings and task rules in Setup to generate staff tasks.
        </p>
      )}
    </section>
  );
}

export function DirectoryTablePanel({
  data,
  onDataChange,
}: {
  data: TemplateFormData;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
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
    const nextCommittee = committees[editingCommitteeIndex];
    if (!nextCommittee) {
      setEditingCommitteeIndex(null);
      setCommitteeDraft(null);
    }
  }, [committees, editingCommitteeIndex]);

  function addCommittee() {
    if (committees.length >= 8) return;
    onDataChange((currentData) => {
      const currentCommittees = getRows(currentData, "committees");
      if (currentCommittees.length >= 8) return currentData;
      return {
        ...currentData,
        committees: [...currentCommittees, { name: "", chair: "", notes: "" }],
      };
    });
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

  function saveCommitteeDraft() {
    if (editingCommitteeIndex === null || !committeeDraft) return;
    onDataChange((currentData) => ({
      ...currentData,
      committees: getRows(currentData, "committees").map((committee, index) =>
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
            onClick={addCommittee}
          >
            <Plus className="size-4" />
            Add committee
          </Button>
        </div>
      </div>

      {showFilters ? (
        <div
          id="board-calendar-directory-filters"
          className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Committee">
            <Input
              aria-label="Filter directory by committee"
              value={committeeFilter}
              placeholder="Committee name"
              onChange={(event) => setCommitteeFilter(event.target.value)}
            />
          </Field>
          <Field label="Chair">
            <Input
              aria-label="Filter directory by chair"
              value={chairFilter}
              placeholder="Chair name"
              onChange={(event) => setChairFilter(event.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Select value={notesFilter} onValueChange={setNotesFilter}>
              <SelectTrigger aria-label="Filter directory by notes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {noteFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        </div>
      ) : null}

      {committees.length ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Committee</TableHead>
                  <TableHead>Chair</TableHead>
                  <TableHead className="w-[120px]">Notes</TableHead>
                  <TableHead className="w-[210px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommittees.map(({ committee, index }) => (
                  <TableRow key={getCommitteeRowKey(committee, index)}>
                    <TableCell className="min-w-[220px] font-semibold text-slate-950">
                      {getString(committee, "name") || "Untitled committee"}
                    </TableCell>
                    <TableCell className="min-w-[180px] text-slate-700">
                      {getString(committee, "chair") || "No chair assigned"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">
                      {getString(committee, "notes") ? (
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
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Edit committee ${index + 1}`}
                          onClick={() => openCommitteeEditor(index)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          aria-label={`Remove committee ${index + 1}`}
                          onClick={() => removeCommittee(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!filteredCommittees.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              No directory entries match the current filters.
            </p>
          ) : null}

          <Dialog
            open={editingCommitteeIndex !== null}
            onOpenChange={(open) => {
              if (!open) closeCommitteeEditor();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit directory entry</DialogTitle>
                <DialogDescription>
                  Update the committee name, chair, and internal notes.
                </DialogDescription>
              </DialogHeader>
              {committeeDraft && editingCommittee ? (
                <div className="space-y-4">
                  <Field label="Committee name">
                    <Input
                      aria-label={`Committee ${(editingCommitteeIndex ?? 0) + 1} name`}
                      value={getString(committeeDraft, "name")}
                      onChange={(event) =>
                        updateCommitteeDraft("name", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Chair">
                    <Input
                      aria-label={`Committee ${(editingCommitteeIndex ?? 0) + 1} chair`}
                      value={getString(committeeDraft, "chair")}
                      onChange={(event) =>
                        updateCommitteeDraft("chair", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Notes">
                    <Textarea
                      aria-label={`Committee ${(editingCommitteeIndex ?? 0) + 1} notes`}
                      value={getString(committeeDraft, "notes")}
                      placeholder="Add context, meeting cadence, or contact details."
                      onChange={(event) =>
                        updateCommitteeDraft("notes", event.target.value)
                      }
                    />
                  </Field>
                </div>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={saveCommitteeDraft}>
                  Save directory entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No committees yet. Add one when this board uses committees or named
          working groups.
        </p>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status || "Not Started";
  const statusClassName =
    {
      "Not Started": "border-slate-200 bg-slate-50 text-slate-600",
      "In Progress": "border-amber-200 bg-amber-50 text-amber-800",
      Complete: "border-green-200 bg-green-50 text-green-800",
      Blocked: "border-red-200 bg-red-50 text-red-800",
    }[normalizedStatus] ?? "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <Badge variant="outline" className={statusClassName}>
      {normalizedStatus}
    </Badge>
  );
}

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
    .filter(({ milestone }) => {
      const targetDate = getString(milestone, "calculated_date");
      const done = Boolean(milestone.done);

      return (
        includesFilterValue(getString(milestone, "task"), taskFilter) &&
        (!targetFromFilter || targetDate >= targetFromFilter) &&
        (!targetToFilter || targetDate <= targetToFilter) &&
        (trackFilter === "all" ||
          (getString(milestone, "track") || "Governance") === trackFilter) &&
        (responsibleFilter === "all" ||
          getString(milestone, "responsible") === responsibleFilter) &&
        (statusFilter === "all" ||
          (getString(milestone, "status") || "Not Started") === statusFilter) &&
        (doneFilter === "all" ||
          (doneFilter === "done" ? done : !done)) &&
        matchesNoteFilter(getString(milestone, "notes"), notesFilter)
      );
    });
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
    const nextMilestone = milestones[editingMilestoneIndex];
    if (!nextMilestone) {
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
    const nextMilestone = {
      track: "Governance",
      task: "",
      days_before: daysBefore,
      calculated_date: calculateAgmMilestoneDate(agmDate, daysBefore),
      responsible: "Administrator",
      status: "Not Started",
      notes: "",
      done: false,
    };
    setEditingMilestoneIndex("new");
    setMilestoneDraft(nextMilestone);
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

  function removeMilestone(index: number) {
    onChange(["agm_milestones"], removeRow(milestones, index));
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
        <div
          id="board-calendar-agm-filters"
          className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Task">
            <Input
              aria-label="Filter AGM milestones by task"
              value={taskFilter}
              placeholder="Milestone name"
              onChange={(event) => setTaskFilter(event.target.value)}
            />
          </Field>
          <Field label="Target from">
            <Input
              aria-label="Filter AGM milestones target from"
              type="date"
              value={targetFromFilter}
              onChange={(event) => setTargetFromFilter(event.target.value)}
            />
          </Field>
          <Field label="Target to">
            <Input
              aria-label="Filter AGM milestones target to"
              type="date"
              value={targetToFilter}
              onChange={(event) => setTargetToFilter(event.target.value)}
            />
          </Field>
          <Field label="Track">
            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger aria-label="Filter AGM milestones by track">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracks</SelectItem>
                {trackOptions.map((track) => (
                  <SelectItem key={track} value={track}>
                    {track}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Responsible">
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger aria-label="Filter AGM milestones by responsible">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All responsible</SelectItem>
                {responsibleOptions.map((responsible) => (
                  <SelectItem key={responsible} value={responsible}>
                    {responsible}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter AGM milestones by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Select value={notesFilter} onValueChange={setNotesFilter}>
              <SelectTrigger aria-label="Filter AGM milestones by notes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {noteFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Done">
            <Select value={doneFilter} onValueChange={setDoneFilter}>
              <SelectTrigger aria-label="Filter AGM milestones by done">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All milestones</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="not_done">Not done</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        </div>
      ) : null}

      {milestones.length ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task / deliverable</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Days before</TableHead>
                  <TableHead>Target date</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Notes</TableHead>
                  <TableHead className="w-[90px]">Done</TableHead>
                  <TableHead className="w-[210px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMilestones.map(({ milestone, index }) => (
                  <TableRow key={getAgmMilestoneRowKey(milestone, index)}>
                    <TableCell className="min-w-[220px] font-semibold text-slate-950">
                      {getString(milestone, "task") || "Untitled milestone"}
                    </TableCell>
                    <TableCell className="min-w-[140px] text-slate-700">
                      {getString(milestone, "track") || "Governance"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-700">
                      {getNumber(milestone, "days_before")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-700">
                      {getString(milestone, "calculated_date") || "No target date"}
                    </TableCell>
                    <TableCell className="min-w-[160px] text-slate-700">
                      {getString(milestone, "responsible") || "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={getString(milestone, "status")} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">
                      {getString(milestone, "notes") ? (
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
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {milestone.done ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Edit AGM milestone ${index + 1}`}
                          onClick={() => openMilestoneEditor(index)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          aria-label={`Remove AGM milestone ${index + 1}`}
                          onClick={() => removeMilestone(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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

      <Dialog
        open={editingMilestoneIndex !== null}
        onOpenChange={(open) => {
          if (!open) closeMilestoneEditor();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit AGM milestone</DialogTitle>
            <DialogDescription>
              Target date is calculated from the confirmed AGM date and days
              before AGM.
            </DialogDescription>
          </DialogHeader>
          {milestoneDraft && (editingMilestone || editingMilestoneIndex === "new") ? (
            <div className="space-y-4">
              <Field label="Task / deliverable">
                <Input
                  aria-label={`AGM milestone ${activeMilestoneNumber} task`}
                  placeholder="Send formal AGM notice"
                  value={getString(milestoneDraft, "task")}
                  onChange={(event) =>
                    updateMilestoneDraft("task", event.target.value)
                  }
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Days before AGM">
                  <Input
                    aria-label={`AGM milestone ${activeMilestoneNumber} days before AGM`}
                    type="number"
                    value={String(getNumber(milestoneDraft, "days_before"))}
                    onChange={(event) =>
                      updateMilestoneDraft(
                        "days_before",
                        Number(event.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Target date">
                  <Input
                    aria-label={`AGM milestone ${activeMilestoneNumber} target date`}
                    value={getString(milestoneDraft, "calculated_date")}
                    readOnly
                  />
                </Field>
                <Field label="Track">
                  <Select
                    value={getString(milestoneDraft, "track") || "Governance"}
                    onValueChange={(value) => updateMilestoneDraft("track", value)}
                  >
                    <SelectTrigger
                      aria-label={`AGM milestone ${activeMilestoneNumber} track`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {trackOptions.map((track) => (
                        <SelectItem key={track} value={track}>
                          {track}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Responsible">
                  <ResponsibleSelect
                    label={`AGM milestone ${activeMilestoneNumber} responsible`}
                    options={setup.responsibleOptions}
                    value={getString(milestoneDraft, "responsible") || "Administrator"}
                    onChange={(value) =>
                      updateMilestoneDraft("responsible", value)
                    }
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={getString(milestoneDraft, "status") || "Not Started"}
                    onValueChange={(value) => updateMilestoneDraft("status", value)}
                  >
                    <SelectTrigger
                      aria-label={`AGM milestone ${activeMilestoneNumber} status`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input
                    aria-label={`AGM milestone ${activeMilestoneNumber} done`}
                    type="checkbox"
                    checked={Boolean(milestoneDraft.done)}
                    onChange={(event) =>
                      updateMilestoneDraft("done", event.target.checked)
                    }
                  />
                  Done
                </label>
              </div>

              <Field label="Notes">
                <Textarea
                  aria-label={`AGM milestone ${activeMilestoneNumber} notes`}
                  placeholder="Add timing assumptions, legal notes, or ownership context."
                  value={getString(milestoneDraft, "notes")}
                  onChange={(event) =>
                    updateMilestoneDraft("notes", event.target.value)
                  }
                />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={saveMilestoneDraft}>
              Save milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ResponsibleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedValue = value || "Administrator";
  const normalizedOptions = options.includes(selectedValue)
    ? options
    : [selectedValue, ...options];

  return (
    <Select value={selectedValue} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
