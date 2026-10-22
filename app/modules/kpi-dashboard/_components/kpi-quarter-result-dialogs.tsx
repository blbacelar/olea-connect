import { Pencil, Save, Trash2 } from "lucide-react";

import {
  deleteKpiQuarterResult,
  saveKpiQuarterResult,
} from "@/app/modules/kpi-dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { KpiDefinition } from "@/lib/data/kpi-dashboard";
import {
  decimalNumberPattern,
  formatNumber,
  formatPercent,
  ragLabels,
  ragStatuses,
  type QuarterNumber,
  type RagStatus,
} from "@/lib/kpi-dashboard/domain";

import { KpiDefinitionFields } from "./kpi-definition-fields";
import {
  FieldHint,
  HiddenDashboard,
  RagBadge,
  SelectField,
  TrendText,
} from "./kpi-dashboard-ui";
import type { QuarterMetrics } from "./kpi-quarter-metrics";

export function EditQuarterResultDialog({
  dashboardId,
  kpi,
  metrics,
  quarter,
}: {
  dashboardId: string;
  kpi: KpiDefinition;
  metrics: QuarterMetrics;
  quarter: QuarterNumber;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={`Edit KPI and Q${quarter} result for ${kpi.name}`}
          size="icon"
          title={`Edit KPI and Q${quarter} result`}
          variant="outline"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit KPI: {kpi.name}</DialogTitle>
          <DialogDescription>
            Update the KPI definition and Q{quarter} staff result in one place.
            Definition changes apply to every assigned quarter. Grey fields are
            calculated automatically.
          </DialogDescription>
        </DialogHeader>
        <QuarterResultForm
          dashboardId={dashboardId}
          kpi={kpi}
          metrics={metrics}
          quarter={quarter}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteQuarterResultDialog({
  dashboardId,
  kpi,
  quarter,
}: {
  dashboardId: string;
  kpi: KpiDefinition;
  quarter: QuarterNumber;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={`Clear Q${quarter} result for ${kpi.name}`}
          size="icon"
          title={`Clear Q${quarter} result`}
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clear Q{quarter} result?</DialogTitle>
          <DialogDescription>
            This removes the current value, RAG status, and notes for
            &quot;{kpi.name}&quot; in Q{quarter}. The KPI definition stays in place.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteKpiQuarterResult} className="flex flex-wrap gap-3">
          <HiddenDashboard dashboardId={dashboardId} />
          <input type="hidden" name="kpiId" value={kpi.id} />
          <input type="hidden" name="quarter" value={quarter} />
          <SubmitButton pendingText="Clearing..." variant="destructive">
            Clear result
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CalculatedFieldsNotice() {
  return (
    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">Calculated fields</p>
      <p className="mt-1">
        Prior quarter, trend, % to target, variance, and Auto-RAG are calculated
        automatically after this result is saved.
      </p>
    </div>
  );
}

export function QuarterResultFields({
  autoRag,
  currentValue,
  ragStatus,
}: {
  autoRag: RagStatus;
  currentValue?: number | null;
  ragStatus?: RagStatus;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">
        Current value
        <Input
          className="mt-2 bg-amber-50"
          defaultValue={currentValue ?? ""}
          inputMode="decimal"
          name="currentValue"
          pattern={decimalNumberPattern}
          placeholder="Numbers only"
          title="Enter numbers only, with up to 2 decimal places."
        />
        <FieldHint>
          Use numbers only, with up to 2 decimals. Do not include currency
          symbols or percent signs.
        </FieldHint>
      </label>
      <label className="block text-sm font-semibold">
        RAG status
        <SelectField
          className="mt-2"
          defaultValue={ragStatus ?? "na"}
          name="ragStatus"
          options={ragStatuses.map((status) => ({
            label: ragLabels[status],
            value: status,
          }))}
          placeholder="Choose status"
        />
        <FieldHint>
          {getRagHint(autoRag)}
        </FieldHint>
      </label>
    </div>
  );
}

export function QuarterNotesField({
  contextNotes = "",
}: {
  contextNotes?: string | null;
}) {
  return (
    <label className="block text-sm font-semibold">
      Notes / actions
      <Textarea
        className="mt-2 bg-amber-50"
        defaultValue={contextNotes ?? ""}
        maxLength={1200}
        name="contextNotes"
        placeholder="Achievements, issues, data quality notes..."
      />
      <FieldHint>Keep notes concise. Maximum 1,200 characters.</FieldHint>
    </label>
  );
}

function QuarterResultForm({
  dashboardId,
  kpi,
  metrics,
  quarter,
}: {
  dashboardId: string;
  kpi: KpiDefinition;
  metrics: QuarterMetrics;
  quarter: QuarterNumber;
}) {
  return (
    <form action={saveKpiQuarterResult} className="space-y-4">
      <HiddenDashboard dashboardId={dashboardId} />
      <input type="hidden" name="kpiId" value={kpi.id} />
      <input type="hidden" name="quarter" value={quarter} />
      <KpiDefinitionFields kpi={kpi} />
      <CalculatedTrackerFields metrics={metrics} />
      <QuarterResultFields
        autoRag={metrics.autoRag}
        currentValue={metrics.result?.currentValue}
        ragStatus={metrics.result?.ragStatus}
      />
      <QuarterNotesField contextNotes={metrics.result?.contextNotes} />
      <SubmitButton pendingText="Saving KPI...">
        <Save className="h-4 w-4" />
        Save KPI
      </SubmitButton>
    </form>
  );
}

function CalculatedTrackerFields({ metrics }: { metrics: QuarterMetrics }) {
  const fields = [
    ["Prior quarter", formatNumber(metrics.previousValue)],
    ["% to target", formatPercent(metrics.percent)],
    ["Variance", formatNumber(metrics.variance)],
  ] as const;

  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
      {fields.map(([label, value]) => (
        <CalculatedField key={label} label={label} value={value} />
      ))}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Trend
        </p>
        <p className="mt-1">
          <TrendText trend={metrics.trend} />
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Auto-RAG
        </p>
        <p className="mt-1">
          <RagBadge status={metrics.autoRag} />
        </p>
      </div>
    </div>
  );
}

function CalculatedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function getRagHint(autoRag: RagStatus) {
  if (autoRag === "na") {
    return "Staff can override the Auto-RAG suggestion when context warrants.";
  }

  return `Auto-RAG suggests ${ragLabels[autoRag]}, but staff can override when context warrants.`;
}
