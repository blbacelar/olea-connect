"use client";

import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  agmTrackOptions,
  Field,
  getNumber,
  getString,
  ResponsibleSelect,
  type TemplateRecord,
  workflowStatusOptions,
} from "./workflow-utils";

export function AgmMilestoneDialog({
  activeMilestoneNumber,
  editingMilestone,
  editingMilestoneIndex,
  milestoneDraft,
  responsibleOptions,
  onClose,
  onSave,
  onUpdateDraft,
}: {
  activeMilestoneNumber: number;
  editingMilestone: TemplateRecord | null;
  editingMilestoneIndex: number | "new" | null;
  milestoneDraft: TemplateRecord | null;
  responsibleOptions: string[];
  onClose: () => void;
  onSave: () => void;
  onUpdateDraft: (field: string, value: unknown) => void;
}) {
  return (
    <Dialog
      open={editingMilestoneIndex !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
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
                onChange={(event) => onUpdateDraft("task", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Days before AGM">
                <Input
                  aria-label={`AGM milestone ${activeMilestoneNumber} days before AGM`}
                  step={1}
                  type="number"
                  value={String(getNumber(milestoneDraft, "days_before"))}
                  onChange={(event) =>
                    onUpdateDraft("days_before", Number(event.target.value))
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
                  onValueChange={(value) => onUpdateDraft("track", value)}
                >
                  <SelectTrigger
                    aria-label={`AGM milestone ${activeMilestoneNumber} track`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agmTrackOptions.map((track) => (
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
                  options={responsibleOptions}
                  value={getString(milestoneDraft, "responsible") || "Administrator"}
                  onChange={(value) => onUpdateDraft("responsible", value)}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={getString(milestoneDraft, "status") || "Not Started"}
                  onValueChange={(value) => onUpdateDraft("status", value)}
                >
                  <SelectTrigger
                    aria-label={`AGM milestone ${activeMilestoneNumber} status`}
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
              <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <Checkbox
                  aria-label={`AGM milestone ${activeMilestoneNumber} done`}
                  checked={Boolean(milestoneDraft.done)}
                  onChange={(event) =>
                    onUpdateDraft("done", event.target.checked)
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
            Save milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
