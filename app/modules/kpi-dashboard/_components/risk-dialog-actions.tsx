"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormState } from "react-dom";

import {
  createKpiRiskDialog,
  deleteKpiRiskDialog,
  updateKpiRiskDialog,
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
import type { KpiRisk } from "@/lib/data/kpi-dashboard";
import { ragLabels, ragStatuses } from "@/lib/kpi-dashboard/domain";

import {
  ActionStateMessage,
  FieldHint,
  HiddenDashboard,
  ModalSubmitButton,
  SelectField,
  initialState,
  useCloseOnSuccess,
} from "./milestones-risks-dialog-shared";

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

function RiskFields({
  dashboardId,
  risk,
}: {
  dashboardId: string;
  risk?: KpiRisk;
}) {
  const fieldId = getRiskFieldId(risk);

  return (
    <>
      <HiddenDashboard dashboardId={dashboardId} />
      <RiskIdInput risk={risk} />
      <RiskAreaField fieldId={fieldId} risk={risk} />
      <RiskDescriptionField fieldId={fieldId} risk={risk} />
      <RiskMitigationField fieldId={fieldId} risk={risk} />
      <RiskOwnerStatusFields fieldId={fieldId} risk={risk} />
    </>
  );
}

function getRiskFieldId(risk?: KpiRisk) {
  return risk ? `risk-${risk.id}` : "risk-new";
}

function RiskIdInput({ risk }: { risk?: KpiRisk }) {
  return risk ? <input type="hidden" name="riskId" value={risk.id} /> : null;
}

function RiskAreaField({
  fieldId,
  risk,
}: {
  fieldId: string;
  risk?: KpiRisk;
}) {
  return (
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
  );
}

function RiskDescriptionField({
  fieldId,
  risk,
}: {
  fieldId: string;
  risk?: KpiRisk;
}) {
  return (
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
  );
}

function RiskMitigationField({
  fieldId,
  risk,
}: {
  fieldId: string;
  risk?: KpiRisk;
}) {
  return (
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
  );
}

function RiskOwnerStatusFields({
  fieldId,
  risk,
}: {
  fieldId: string;
  risk?: KpiRisk;
}) {
  return (
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
