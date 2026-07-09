"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";

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
  const editingTask =
    editingTaskIndex === null ? null : tasks[editingTaskIndex] ?? null;

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

  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-staff-task-list-panel"
    >
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Staff task list</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Generated from Meeting Schedule and Setup task rules. Update owner,
          status, and notes here; generated due dates stay connected.
        </p>
      </div>
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
                {tasks.map((task, index) => (
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
                        size="sm"
                        aria-label={`Edit task ${index + 1}`}
                        onClick={() => openTaskEditor(index)}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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

  const editingCommittee =
    editingCommitteeIndex === null
      ? null
      : committees[editingCommitteeIndex] ?? null;

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
                {committees.map((committee, index) => (
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
                          size="sm"
                          aria-label={`Edit committee ${index + 1}`}
                          onClick={() => openCommitteeEditor(index)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          aria-label={`Remove committee ${index + 1}`}
                          onClick={() => removeCommittee(index)}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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

  function updateMilestone(index: number, field: string, value: unknown) {
    const nextRows = updateRow(milestones, index, field, value).map((row) => {
      if (field !== "days_before" && field !== "task") return row;
      return {
        ...row,
        calculated_date: calculateAgmMilestoneDate(
          agmDate,
          getNumber(row, "days_before"),
        ),
      };
    });
    onChange(["agm_milestones"], nextRows);
  }

  function addMilestone() {
    const daysBefore = 30;
    onChange([
      "agm_milestones",
    ], [
      ...milestones,
      {
        track: "Governance",
        task: "",
        days_before: daysBefore,
        calculated_date: calculateAgmMilestoneDate(agmDate, daysBefore),
        responsible: "Administrator",
        status: "Not Started",
        notes: "",
        done: false,
      },
    ]);
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
        <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
          <Plus className="size-4" />
          Add milestone
        </Button>
      </div>
      <Field label="Confirmed AGM date">
        <Input
          aria-label="Confirmed AGM date"
          type="date"
          value={agmDate}
          onChange={(event) => updateAgmDate(event.target.value)}
        />
      </Field>
      <div className="space-y-3">
        {milestones.map((milestone, index) => (
          <div key={index} className="rounded-xl border bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr_1fr_1fr_auto]">
              <Input
                aria-label={`AGM milestone ${index + 1} task`}
                placeholder="Send formal AGM notice"
                value={getString(milestone, "task")}
                onChange={(event) =>
                  updateMilestone(index, "task", event.target.value)
                }
              />
              <Input
                aria-label={`AGM milestone ${index + 1} days before AGM`}
                type="number"
                value={String(getNumber(milestone, "days_before"))}
                onChange={(event) =>
                  updateMilestone(index, "days_before", Number(event.target.value))
                }
              />
              <Input
                aria-label={`AGM milestone ${index + 1} target date`}
                value={getString(milestone, "calculated_date")}
                readOnly
              />
              <Select
                value={getString(milestone, "track") || "Governance"}
                onValueChange={(value) => updateMilestone(index, "track", value)}
              >
                <SelectTrigger aria-label={`AGM milestone ${index + 1} track`}>
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
              <ResponsibleSelect
                label={`AGM milestone ${index + 1} responsible`}
                options={setup.responsibleOptions}
                value={getString(milestone, "responsible") || "Administrator"}
                onChange={(value) => updateMilestone(index, "responsible", value)}
              />
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() =>
                  onChange(["agm_milestones"], removeRow(milestones, index))
                }
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[240px_1fr]">
              <Select
                value={getString(milestone, "status") || "Not Started"}
                onValueChange={(value) => updateMilestone(index, "status", value)}
              >
                <SelectTrigger aria-label={`AGM milestone ${index + 1} status`}>
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
              <Textarea
                aria-label={`AGM milestone ${index + 1} notes`}
                placeholder="Notes"
                value={getString(milestone, "notes")}
                onChange={(event) =>
                  updateMilestone(index, "notes", event.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>
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
