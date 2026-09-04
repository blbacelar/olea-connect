"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  Field,
  getString,
  ResponsibleSelect,
  type TemplateRecord,
  workflowStatusOptions,
} from "./workflow-utils";

export function StaffTaskEditorDialog({
  editingTask,
  editingTaskIndex,
  responsibleOptions,
  taskDraft,
  onClose,
  onSave,
  onUpdateDraft,
}: {
  editingTask: TemplateRecord | null;
  editingTaskIndex: number | null;
  responsibleOptions: string[];
  taskDraft: TemplateRecord | null;
  onClose: () => void;
  onSave: () => void;
  onUpdateDraft: (field: string, value: unknown) => void;
}) {
  return (
    <Dialog
      open={editingTaskIndex !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit workflow task</DialogTitle>
          <DialogDescription>
            Update the owner, status, and notes for this generated task. The due
            date stays tied to the meeting and setup rule.
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
                  options={responsibleOptions}
                  value={getString(taskDraft, "responsible")}
                  onChange={(value) => onUpdateDraft("responsible", value)}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={getString(taskDraft, "status") || "Not Started"}
                  onValueChange={(value) => onUpdateDraft("status", value)}
                >
                  <SelectTrigger
                    aria-label={`Task ${(editingTaskIndex ?? 0) + 1} status`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workflowStatusOptions.map((status) => (
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
                onChange={(event) => onUpdateDraft("notes", event.target.value)}
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
          <Button type="button" onClick={onSave}>
            Save task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
