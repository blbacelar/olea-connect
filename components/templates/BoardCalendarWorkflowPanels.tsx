"use client";

import type { ReactNode } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildBoardCalendarSetup,
  buildGeneratedStaffTasks,
  calculateAgmMilestoneDate,
} from "@/lib/template-renderer/board-calendar-editor";
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

export function BoardCalendarSetupPanel({
  data,
  onChange,
}: {
  data: TemplateFormData;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const setup = buildBoardCalendarSetup(data);
  const committees = getRows(data, "committees");
  const taskRules = getRows(data, "operational_task_rules");

  function updateTopLevel(key: string, value: string) {
    onChange([key], value);
  }

  function updateCommittee(index: number, field: string, value: string) {
    onChange(["committees"], updateRow(committees, index, field, value));
  }

  function addCommittee() {
    if (committees.length >= 8) return;
    onChange(["committees"], [...committees, { name: "", chair: "", notes: "" }]);
  }

  function updateTaskRule(index: number, field: string, value: unknown) {
    onChange(["operational_task_rules"], updateRow(taskRules, index, field, value));
  }

  function updateTaskRuleTiming(index: number, timing: "after" | "before") {
    const currentRule = taskRules[index];
    const currentDays =
      getNumber(currentRule, "days_after") || getNumber(currentRule, "days_before");
    onChange(
      ["operational_task_rules"],
      taskRules.map((rule, ruleIndex) =>
        ruleIndex === index
          ? {
              ...rule,
              days_after: timing === "after" ? currentDays : 0,
              days_before: timing === "before" ? currentDays : 0,
            }
          : rule,
      ),
    );
  }

  function addTaskRule() {
    onChange([
      "operational_task_rules",
    ], [
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
                onClick={() => onChange(["committees"], removeRow(committees, index))}
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
                  onClick={() =>
                    onChange(["operational_task_rules"], removeRow(taskRules, index))
                  }
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
  const tasks = buildGeneratedStaffTasks(data);

  function updateTask(index: number, field: string, value: unknown) {
    onChange(
      ["tasks"],
      updateRow(tasks as unknown as TemplateRecord[], index, field, value),
    );
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
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div key={task.generated_key} className="rounded-xl border p-4">
              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
                <div>
                  <p className="font-semibold text-slate-950">{task.task}</p>
                  <p className="text-sm text-slate-500">{task.related_meeting}</p>
                </div>
                <Field label="Due date">
                  <Input value={task.due_date} readOnly />
                </Field>
                <Field label="Responsible">
                  <ResponsibleSelect
                    label={`Task ${index + 1} responsible`}
                    options={setup.responsibleOptions}
                    value={task.responsible}
                    onChange={(value) => updateTask(index, "responsible", value)}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={task.status}
                    onValueChange={(value) => updateTask(index, "status", value)}
                  >
                    <SelectTrigger aria-label={`Task ${index + 1} status`}>
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
              <Textarea
                aria-label={`Task ${index + 1} notes`}
                className="mt-3"
                placeholder="Notes"
                value={task.notes}
                onChange={(event) => updateTask(index, "notes", event.target.value)}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          Add meetings and task rules in Setup to generate staff tasks.
        </p>
      )}
    </section>
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
