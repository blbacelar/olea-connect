"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormState } from "react-dom";

import {
  createKpiMilestoneDialog,
  deleteKpiMilestoneDialog,
  updateKpiMilestoneDialog,
} from "@/app/modules/kpi-dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { KpiMilestone } from "@/lib/data/kpi-dashboard";
import {
  milestoneLabels,
  milestoneStatuses,
} from "@/lib/kpi-dashboard/domain";

import {
  ActionStateMessage,
  FieldHint,
  HiddenDashboard,
  ModalSubmitButton,
  SelectField,
  initialState,
  useCloseOnSuccess,
} from "./milestones-risks-dialog-shared";

function MilestoneDialogForm({
  dashboardId,
  milestone,
  setOpen,
}: {
  dashboardId: string;
  milestone?: KpiMilestone;
  setOpen: (open: boolean) => void;
}) {
  const action = milestone ? updateKpiMilestoneDialog : createKpiMilestoneDialog;
  const [state, formAction] = useFormState(action, initialState);
  useCloseOnSuccess(state, setOpen);

  return (
    <form action={formAction} className="space-y-4">
      <MilestoneFields dashboardId={dashboardId} milestone={milestone} />
      <ActionStateMessage state={state} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <ModalSubmitButton pendingText={milestone ? "Updating..." : "Adding..."}>
          {milestone ? "Update milestone" : "Add milestone"}
        </ModalSubmitButton>
      </div>
    </form>
  );
}

function DeleteMilestoneDialogForm({
  dashboardId,
  milestoneId,
  setOpen,
}: {
  dashboardId: string;
  milestoneId: string;
  setOpen: (open: boolean) => void;
}) {
  const [state, formAction] = useFormState(deleteKpiMilestoneDialog, initialState);
  useCloseOnSuccess(state, setOpen);

  return (
    <form action={formAction} className="space-y-4">
      <HiddenDashboard dashboardId={dashboardId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <ActionStateMessage state={state} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <ModalSubmitButton pendingText="Deleting..." variant="destructive">
          Delete milestone
        </ModalSubmitButton>
      </DialogFooter>
    </form>
  );
}

function MilestoneFields({
  dashboardId,
  milestone,
}: {
  dashboardId: string;
  milestone?: KpiMilestone;
}) {
  const fieldId = getMilestoneFieldId(milestone);

  return (
    <>
      <HiddenDashboard dashboardId={dashboardId} />
      <MilestoneIdInput milestone={milestone} />
      <MilestoneTitleField fieldId={fieldId} milestone={milestone} />
      <MilestoneOwnerDateFields fieldId={fieldId} milestone={milestone} />
      <MilestoneStatusField milestone={milestone} />
      <MilestoneNotesField fieldId={fieldId} milestone={milestone} />
    </>
  );
}

function getMilestoneFieldId(milestone?: KpiMilestone) {
  return milestone ? `milestone-${milestone.id}` : "milestone-new";
}

function MilestoneIdInput({ milestone }: { milestone?: KpiMilestone }) {
  return milestone ? (
    <input type="hidden" name="milestoneId" value={milestone.id} />
  ) : null;
}

function MilestoneTitleField({
  fieldId,
  milestone,
}: {
  fieldId: string;
  milestone?: KpiMilestone;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-title`}>
        Milestone title
      </label>
      <Input
        defaultValue={milestone?.title ?? ""}
        id={`${fieldId}-title`}
        maxLength={160}
        minLength={3}
        name="title"
        placeholder="AGM notice sent"
        required
      />
      <FieldHint>Use 3-160 characters.</FieldHint>
    </div>
  );
}

function MilestoneOwnerDateFields({
  fieldId,
  milestone,
}: {
  fieldId: string;
  milestone?: KpiMilestone;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-owner`}>
          Owner
        </label>
        <Input
          defaultValue={milestone?.owner ?? ""}
          id={`${fieldId}-owner`}
          maxLength={100}
          name="owner"
          placeholder="Board Chair"
        />
        <FieldHint>Optional, up to 100 characters.</FieldHint>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-due-date`}>
          Due date
        </label>
        <Input
          defaultValue={milestone?.dueDate ?? ""}
          id={`${fieldId}-due-date`}
          name="dueDate"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          type="date"
        />
        <FieldHint>Use a valid date.</FieldHint>
      </div>
    </div>
  );
}

function MilestoneStatusField({ milestone }: { milestone?: KpiMilestone }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">Status</label>
      <SelectField
        ariaLabel="Milestone status"
        defaultValue={milestone?.status ?? "not_started"}
        name="status"
        options={milestoneStatuses.map((status) => ({
          label: milestoneLabels[status],
          value: status,
        }))}
      />
    </div>
  );
}

function MilestoneNotesField({
  fieldId,
  milestone,
}: {
  fieldId: string;
  milestone?: KpiMilestone;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-notes`}>
        Notes
      </label>
      <Textarea
        defaultValue={milestone?.notes ?? ""}
        id={`${fieldId}-notes`}
        maxLength={1200}
        name="notes"
        placeholder="Context, blockers, or board-facing notes."
      />
      <FieldHint>Maximum 1,200 characters.</FieldHint>
    </div>
  );
}

export function MilestoneDialogAction({
  dashboardId,
  milestone,
}: {
  dashboardId: string;
  milestone?: KpiMilestone;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {milestone ? (
          <Button
            aria-label={`Edit milestone ${milestone.title}`}
            size="icon"
            type="button"
            variant="outline"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit milestone" : "Add milestone"}</DialogTitle>
          <DialogDescription>
            {milestone
              ? "Update milestone ownership, date, status, and notes."
              : "Create a dated milestone for this reporting dashboard."}
          </DialogDescription>
        </DialogHeader>
        <MilestoneDialogForm
          dashboardId={dashboardId}
          milestone={milestone}
          setOpen={setOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteMilestoneDialogAction({
  dashboardId,
  milestone,
}: {
  dashboardId: string;
  milestone: KpiMilestone;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Delete milestone ${milestone.title}`}
          size="icon"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete this milestone?</DialogTitle>
          <DialogDescription>
            “{milestone.title}” will be removed from this KPI dashboard. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DeleteMilestoneDialogForm
          dashboardId={dashboardId}
          milestoneId={milestone.id}
          setOpen={setOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
