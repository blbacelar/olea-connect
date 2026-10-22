"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildBoardCalendarSetup,
  syncBoardCalendarGeneratedTasks,
} from "@/lib/template-renderer/board-calendar-editor";
import { getWorkspaceMemberDisplayName } from "@/lib/template-renderer/board-calendar-chairs";
import { setValue } from "@/lib/template-renderer/schema";
import type {
  FieldPath,
  TemplateFormData,
  TemplateValue,
  WorkspaceMemberOption,
} from "@/lib/template-renderer/types";

import {
  Field,
  getNumber,
  getRows,
  getString,
  getTopLevelString,
  removeRow,
  ResponsibleSelect,
  type TemplateRecord,
  updateRow,
  WorkspaceMemberSelect,
} from "./workflow-utils";

export function BoardCalendarSetupPanel({
  data,
  onChange,
  onDataChange,
  workspaceMembers,
}: {
  data: TemplateFormData;
  onChange: (path: FieldPath, value: TemplateValue) => void;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
  workspaceMembers: WorkspaceMemberOption[];
}) {
  const setup = buildBoardCalendarSetup(data);
  const taskRules = getRows(data, "operational_task_rules");

  function updateTopLevel(key: string, value: string) {
    onChange([key], value);
  }

  function assignBoardChair(member: WorkspaceMemberOption | null) {
    onDataChange((currentData) => ({
      ...currentData,
      board_chair: member ? getWorkspaceMemberDisplayName(member) : "",
      board_chair_user_id: member?.id ?? "",
    }));
  }

  function assignAdministrator(member: WorkspaceMemberOption | null) {
    onDataChange((currentData) => ({
      ...currentData,
      administrator: member ? getWorkspaceMemberDisplayName(member) : "",
      administrator_email: member?.email ?? "",
      administrator_user_id: member?.id ?? "",
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
    updateTaskRulesFromCurrent((currentRules) => [
      ...currentRules,
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
            onChange={(event) =>
              updateTopLevel("organization_name", event.target.value)
            }
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
          <WorkspaceMemberSelect
            ariaLabel="Administrator"
            emptyOptionLabel="No administrator assigned"
            memberId={getTopLevelString(data, "administrator_user_id")}
            members={workspaceMembers}
            savedMemberEmail={setup.administratorEmail}
            savedMemberName={setup.administrator}
            onMemberChange={assignAdministrator}
          />
          <p className="text-xs leading-5 text-slate-500">
            The selected workspace member&apos;s email is used automatically.
          </p>
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
          <WorkspaceMemberSelect
            ariaLabel="Board Chair"
            memberId={getTopLevelString(data, "board_chair_user_id")}
            members={workspaceMembers}
            savedMemberName={setup.boardChair}
            onMemberChange={assignBoardChair}
          />
        </Field>
      </div>
      <TaskRuleList
        responsibleOptions={setup.responsibleOptions}
        taskRules={taskRules}
        onAddTaskRule={addTaskRule}
        onRemoveTaskRule={(index) => updateTaskRules(removeRow(taskRules, index))}
        onUpdateTaskRule={updateTaskRule}
        onUpdateTaskRuleTiming={updateTaskRuleTiming}
      />
    </section>
  );
}

function TaskRuleList({
  responsibleOptions,
  taskRules,
  onAddTaskRule,
  onRemoveTaskRule,
  onUpdateTaskRule,
  onUpdateTaskRuleTiming,
}: {
  responsibleOptions: string[];
  taskRules: TemplateRecord[];
  onAddTaskRule: () => void;
  onRemoveTaskRule: (index: number) => void;
  onUpdateTaskRule: (index: number, field: string, value: unknown) => void;
  onUpdateTaskRuleTiming: (index: number, timing: "after" | "before") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">
            Operational task rules
          </h4>
          <p className="text-sm text-slate-500">
            These rules generate the staff task list from every matching meeting.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddTaskRule}>
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
                  onUpdateTaskRule(index, "label", event.target.value)
                }
              />
              <Input
                aria-label={`Task rule ${index + 1} days`}
                step={1}
                type="number"
                value={String(
                  isAfter
                    ? getNumber(rule, "days_after")
                    : getNumber(rule, "days_before"),
                )}
                onChange={(event) =>
                  onUpdateTaskRule(
                    index,
                    isAfter ? "days_after" : "days_before",
                    Number(event.target.value),
                  )
                }
              />
              <Select
                value={isAfter ? "after" : "before"}
                onValueChange={(value) =>
                  onUpdateTaskRuleTiming(index, value as "after" | "before")
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
                  onUpdateTaskRule(index, "applies_to", value)
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
                options={responsibleOptions}
                value={getString(rule, "responsible") || "Administrator"}
                onChange={(value) =>
                  onUpdateTaskRule(index, "responsible", value)
                }
              />
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => onRemoveTaskRule(index)}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
