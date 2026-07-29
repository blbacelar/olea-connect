"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  createKpiMilestoneDialog,
  createKpiRiskDialog,
  deleteKpiMilestoneDialog,
  deleteKpiRiskDialog,
  updateKpiMilestoneDialog,
  updateKpiRiskDialog,
  type KpiDialogActionState,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KpiMilestone, KpiRisk } from "@/lib/data/kpi-dashboard";
import {
  milestoneLabels,
  milestoneStatuses,
  ragLabels,
  ragStatuses,
} from "@/lib/kpi-dashboard/domain";

const initialState: KpiDialogActionState = {
  message: "",
  status: "idle",
};

function HiddenDashboard({ dashboardId }: { dashboardId: string }) {
  return <input type="hidden" name="dashboardId" value={dashboardId} />;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-slate-500">{children}</p>;
}

function ModalSubmitButton({
  children,
  pendingText,
  variant = "default",
}: {
  children: string;
  pendingText: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? pendingText : children}
    </Button>
  );
}

function SelectField({
  ariaLabel,
  defaultValue,
  name,
  options,
}: {
  ariaLabel: string;
  defaultValue: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <Select defaultValue={defaultValue} name={name}>
      <SelectTrigger aria-label={ariaLabel} className="h-11 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActionStateMessage({ state }: { state: KpiDialogActionState }) {
  if (state.status !== "error") return null;

  return (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
      {state.message}
    </p>
  );
}

function useCloseOnSuccess(
  state: KpiDialogActionState,
  setOpen: (open: boolean) => void,
) {
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success") return;

    setOpen(false);
    router.refresh();
  }, [router, setOpen, state.status]);
}

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

function RiskDialogForm({
  dashboardId,
  risk,
  setOpen,
}: {
  dashboardId: string;
  risk?: KpiRisk;
  setOpen: (open: boolean) => void;
}) {
  const action = risk ? updateKpiRiskDialog : createKpiRiskDialog;
  const [state, formAction] = useFormState(action, initialState);
  useCloseOnSuccess(state, setOpen);

  return (
    <form action={formAction} className="space-y-4">
      <RiskFields dashboardId={dashboardId} risk={risk} />
      <ActionStateMessage state={state} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <ModalSubmitButton pendingText={risk ? "Updating..." : "Adding..."}>
          {risk ? "Update risk" : "Add risk"}
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

function DeleteRiskDialogForm({
  dashboardId,
  riskId,
  setOpen,
}: {
  dashboardId: string;
  riskId: string;
  setOpen: (open: boolean) => void;
}) {
  const [state, formAction] = useFormState(deleteKpiRiskDialog, initialState);
  useCloseOnSuccess(state, setOpen);

  return (
    <form action={formAction} className="space-y-4">
      <HiddenDashboard dashboardId={dashboardId} />
      <input type="hidden" name="riskId" value={riskId} />
      <ActionStateMessage state={state} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <ModalSubmitButton pendingText="Deleting..." variant="destructive">
          Delete risk
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
  const fieldId = milestone ? `milestone-${milestone.id}` : "milestone-new";

  return (
    <>
      <HiddenDashboard dashboardId={dashboardId} />
      {milestone ? (
        <input type="hidden" name="milestoneId" value={milestone.id} />
      ) : null}
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
    </>
  );
}

function RiskFields({
  dashboardId,
  risk,
}: {
  dashboardId: string;
  risk?: KpiRisk;
}) {
  const fieldId = risk ? `risk-${risk.id}` : "risk-new";

  return (
    <>
      <HiddenDashboard dashboardId={dashboardId} />
      {risk ? <input type="hidden" name="riskId" value={risk.id} /> : null}
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-area`}>
          Risk area
        </label>
        <Input
          defaultValue={risk?.area ?? ""}
          id={`${fieldId}-area`}
          maxLength={100}
          minLength={2}
          name="area"
          placeholder="Finance, governance, program delivery"
          required
        />
        <FieldHint>Use 2-100 characters.</FieldHint>
      </div>
      <div>
        <label
          className="text-sm font-semibold text-slate-700"
          htmlFor={`${fieldId}-description`}
        >
          Risk description
        </label>
        <Textarea
          defaultValue={risk?.description ?? ""}
          id={`${fieldId}-description`}
          maxLength={600}
          minLength={3}
          name="description"
          placeholder="Describe the risk clearly."
          required
        />
        <FieldHint>Use 3-600 characters.</FieldHint>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-mitigation`}>
          Mitigation
        </label>
        <Textarea
          defaultValue={risk?.mitigation ?? ""}
          id={`${fieldId}-mitigation`}
          maxLength={1200}
          name="mitigation"
          placeholder="Controls, owners, or next mitigation steps."
        />
        <FieldHint>Maximum 1,200 characters.</FieldHint>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor={`${fieldId}-owner`}>
            Owner
          </label>
          <Input
            defaultValue={risk?.owner ?? ""}
            id={`${fieldId}-owner`}
            maxLength={100}
            name="owner"
            placeholder="Executive Director"
          />
          <FieldHint>Optional, up to 100 characters.</FieldHint>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">RAG status</label>
          <SelectField
            ariaLabel="Risk RAG status"
            defaultValue={risk?.ragStatus ?? "na"}
            name="ragStatus"
            options={ragStatuses.map((status) => ({
              label: ragLabels[status],
              value: status,
            }))}
          />
        </div>
      </div>
    </>
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

export function RiskDialogAction({
  dashboardId,
  risk,
}: {
  dashboardId: string;
  risk?: KpiRisk;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {risk ? (
          <Button
            aria-label={`Edit risk ${risk.area}`}
            size="icon"
            type="button"
            variant="outline"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add risk
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risk ? "Edit risk" : "Add risk"}</DialogTitle>
          <DialogDescription>
            {risk
              ? "Update risk details, mitigation, owner, and RAG status."
              : "Add a risk to the dashboard register."}
          </DialogDescription>
        </DialogHeader>
        <RiskDialogForm dashboardId={dashboardId} risk={risk} setOpen={setOpen} />
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

export function DeleteRiskDialogAction({
  dashboardId,
  risk,
}: {
  dashboardId: string;
  risk: KpiRisk;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Delete risk ${risk.area}`}
          size="icon"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete this risk?</DialogTitle>
          <DialogDescription>
            “{risk.area}” will be removed from this KPI dashboard. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DeleteRiskDialogForm
          dashboardId={dashboardId}
          riskId={risk.id}
          setOpen={setOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
