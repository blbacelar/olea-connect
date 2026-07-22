import {
  ArrowLeft,
  Archive,
  BarChart3,
  ClipboardList,
  Pencil,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  archiveKpiDefinition,
  deleteKpiQuarterResult,
  resetKpiQuarterSettings,
  saveKpiAnnualSummary,
  saveKpiBoardAssessment,
  saveKpiQuarterResult,
  updateKpiDashboardSettings,
  updateKpiQuarterSettings,
} from "@/app/modules/kpi-dashboard/actions";
import {
  DeleteMilestoneDialogAction,
  DeleteRiskDialogAction,
  MilestoneDialogAction,
  RiskDialogAction,
} from "@/app/modules/kpi-dashboard/_components/milestones-risks-actions";
import { AddQuarterResultDialog } from "@/app/modules/kpi-dashboard/_components/add-quarter-result-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  KpiDashboardData,
  KpiDefinition,
} from "@/lib/data/kpi-dashboard";
import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  decimalNumberPattern,
  formatNumber,
  formatPercent,
  milestoneLabels,
  monthOptions,
  positiveDecimalNumberPattern,
  ragLabels,
  ragStatuses,
  suggestRagStatus,
  type QuarterNumber,
  type RagStatus,
} from "@/lib/kpi-dashboard/domain";
import { cn } from "@/lib/utils";

const tabOptions = [
  { value: "board", label: "Board Dashboard" },
  { value: "q1", label: "Q1 Tracker" },
  { value: "q2", label: "Q2 Tracker" },
  { value: "q3", label: "Q3 Tracker" },
  { value: "q4", label: "Q4 Tracker" },
  { value: "milestones", label: "Milestones & Risks" },
  { value: "annual", label: "Annual Summary" },
  { value: "setup", label: "Setup" },
  { value: "settings", label: "Settings" },
] as const;

const quarterValues: QuarterNumber[] = [1, 2, 3, 4];

function HiddenDashboard({ dashboardId }: { dashboardId: string }) {
  return <input type="hidden" name="dashboardId" value={dashboardId} />;
}

function SelectField({
  ariaLabel,
  className,
  defaultValue,
  name,
  options,
  placeholder,
}: {
  ariaLabel?: string;
  className?: string;
  defaultValue?: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger
        aria-label={ariaLabel ?? placeholder}
        className={["h-11 bg-white", className].filter(Boolean).join(" ")}
      >
        <SelectValue placeholder={placeholder} />
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

function RagBadge({ status }: { status: RagStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        status === "green" && "bg-green-100 text-green-800",
        status === "amber" && "bg-amber-100 text-amber-800",
        status === "red" && "bg-red-100 text-red-800",
        status === "na" && "bg-slate-100 text-slate-600",
      )}
    >
      {ragLabels[status]}
    </Badge>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-5 text-slate-500">{children}</p>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-600">
      {children}
    </div>
  );
}

function getResult(data: KpiDashboardData, kpiId: string, quarter: QuarterNumber) {
  return data.results.find(
    (result) => result.kpiId === kpiId && result.quarter === quarter,
  );
}

function getAssessment(data: KpiDashboardData, kpiId: string) {
  return data.assessments.find((assessment) => assessment.kpiId === kpiId);
}

function getQuarterMonths(data: KpiDashboardData, quarter: QuarterNumber) {
  const monthNames = data.quarters
    .filter((assignment) => assignment.quarter === quarter)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (assignment) =>
        monthOptions.find((month) => month.value === assignment.monthNumber)?.label,
    )
    .filter(Boolean);

  return monthNames.length > 0 ? monthNames.join(", ") : "No months assigned";
}

function getQuarterPeriodLabel(data: KpiDashboardData, quarter: QuarterNumber) {
  const quarterMonths = data.quarters
    .filter((assignment) => assignment.quarter === quarter)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((assignment) => {
      const month = monthOptions.find(
        (option) => option.value === assignment.monthNumber,
      );

      return month
        ? [{ label: month.label.slice(0, 3), monthNumber: month.value }]
        : [];
    });

  if (quarterMonths.length === 0) return `Q${quarter}`;
  if (quarterMonths.length === 1) return `Q${quarter} · ${quarterMonths[0].label}`;

  const isContiguous = quarterMonths.every((month, index) => {
    if (index === 0) return true;
    const previous = quarterMonths[index - 1].monthNumber;
    const expected = previous === 12 ? 1 : previous + 1;
    return month.monthNumber === expected;
  });

  if (!isContiguous) {
    return `Q${quarter} · ${quarterMonths.map((month) => month.label).join(", ")}`;
  }

  return `Q${quarter} · ${quarterMonths[0].label} – ${quarterMonths.at(-1)?.label}`;
}

function getLatestQuarterResult(data: KpiDashboardData, kpiId: string) {
  for (const quarter of [...quarterValues].reverse()) {
    const result = getResult(data, kpiId, quarter);
    if (result !== undefined && result.currentValue !== null) {
      return { quarter, result };
    }
  }

  return null;
}

function VarianceValue({ value }: { value: number | null }) {
  return (
    <span className={cn("font-semibold", value === null && "text-slate-500")}>
      {formatNumber(value)}
    </span>
  );
}

function TrendText({
  trend,
}: {
  trend: ReturnType<typeof calculateTrend>;
}) {
  const trendCopy = {
    improving: { label: "Improving", className: "text-green-700" },
    declining: { label: "Declining", className: "text-red-700" },
    stable: { label: "Stable", className: "text-amber-700" },
    not_available: { label: "—", className: "text-slate-500" },
  }[trend];

  return (
    <span className={cn("font-semibold", trendCopy.className)}>
      {trendCopy.label}
    </span>
  );
}

function KpiSummaryCards({ data }: { data: KpiDashboardData }) {
  const fullYearStatuses = data.kpis.map(
    (kpi) => getAssessment(data, kpi.id)?.fullYearRag ?? "na",
  );
  const scorecard = {
    green: fullYearStatuses.filter((status) => status === "green").length,
    amber: fullYearStatuses.filter((status) => status === "amber").length,
    red: fullYearStatuses.filter((status) => status === "red").length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            KPIs
          </p>
          <p className="mt-2 text-3xl font-bold">{data.kpis.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
            Green
          </p>
          <p className="mt-2 text-3xl font-bold">{scorecard.green}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Amber
          </p>
          <p className="mt-2 text-3xl font-bold">{scorecard.amber}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
            Red
          </p>
          <p className="mt-2 text-3xl font-bold">{scorecard.red}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSetupForm({ data }: { data: KpiDashboardData }) {
  return (
    <form action={updateKpiDashboardSettings} className="space-y-4">
      <HiddenDashboard dashboardId={data.dashboard.id} />
      <label className="block text-sm font-semibold">
        Dashboard title
        <Input
          className="mt-2"
          defaultValue={data.dashboard.title}
          maxLength={140}
          minLength={3}
          name="title"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Reporting year
          <Input
            className="mt-2"
            defaultValue={data.dashboard.reportingYear}
            inputMode="numeric"
            max={2100}
            min={2000}
            name="reportingYear"
            pattern="[0-9]{4}"
            required
            type="number"
          />
          <FieldHint>Use a four-digit year, for example 2026.</FieldHint>
        </label>
        <label className="block text-sm font-semibold">
          Financial year end
          <Input
            className="mt-2"
            defaultValue={data.dashboard.financialYearEnd ?? ""}
            name="financialYearEnd"
            type="date"
          />
        </label>
      </div>
      <SubmitButton pendingText="Saving setup...">
        <Save className="h-4 w-4" />
        Save setup
      </SubmitButton>
    </form>
  );
}

function SetupTab({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard setup</CardTitle>
        <CardDescription className="mt-2">
          Update the report title, reporting year, and fiscal year details.{" "} 
          KPIs are added from the Q1-Q4 tracker tabs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DashboardSetupForm data={data} />
      </CardContent>
    </Card>
  );
}

function SettingsTab({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarter settings</CardTitle>
        <p className="text-sm text-slate-600">
          Assign each month to the quarter that matches your organization&apos;s
          reporting cycle. Every month must belong to exactly one quarter.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={updateKpiQuarterSettings}>
          <HiddenDashboard dashboardId={data.dashboard.id} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {monthOptions.map((month) => {
              const assignment = data.quarters.find(
                (quarter) => quarter.monthNumber === month.value,
              );
              return (
                <label
                  className="grid gap-2 rounded-lg border bg-white p-4 text-sm font-semibold"
                  key={month.value}
                >
                  {month.label}
                  <SelectField
                    defaultValue={String(assignment?.quarter ?? 1)}
                    name={`month_${month.value}`}
                    options={quarterValues.map((quarter) => ({
                      label: `Q${quarter}`,
                      value: String(quarter),
                    }))}
                    placeholder="Choose quarter"
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <SubmitButton pendingText="Saving settings...">
              <Save className="h-4 w-4" />
              Save quarter settings
            </SubmitButton>
            <SubmitButton
              formAction={resetKpiQuarterSettings}
              pendingText="Resetting..."
              variant="outline"
            >
              Reset to calendar quarters
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CalculatedTrackerFields({
  autoRag,
  percent,
  previousValue,
  trend,
  variance,
}: {
  autoRag: RagStatus;
  percent: number | null;
  previousValue: number | null;
  trend: ReturnType<typeof calculateTrend>;
  variance: number | null;
}) {
  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Prior quarter
        </p>
        <p className="mt-1 font-semibold">{formatNumber(previousValue)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Trend
        </p>
        <p className="mt-1">
          <TrendText trend={trend} />
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          % to target
        </p>
        <p className="mt-1 font-semibold">{formatPercent(percent)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Variance
        </p>
        <p className="mt-1 font-semibold">{formatNumber(variance)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Auto-RAG
        </p>
        <p className="mt-1">
          <RagBadge status={autoRag} />
        </p>
      </div>
    </div>
  );
}

function KpiDefinitionFields({ kpi }: { kpi?: KpiDefinition }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <label className="block text-sm font-semibold">
        Domain
        <Input
          className="mt-2"
          defaultValue={kpi?.domain ?? ""}
          maxLength={80}
          minLength={2}
          name="domain"
          placeholder="Programs, Finance, People..."
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        KPI name
        <Input
          className="mt-2"
          defaultValue={kpi?.name ?? ""}
          maxLength={140}
          minLength={2}
          name="name"
          placeholder="Client satisfaction"
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Owner
        <Input
          className="mt-2"
          defaultValue={kpi?.owner ?? ""}
          maxLength={100}
          name="owner"
          placeholder="Executive Director"
        />
      </label>
      <label className="block text-sm font-semibold">
        Outcome/funder tag
        <Input
          className="mt-2"
          defaultValue={kpi?.outcomeArea ?? ""}
          maxLength={120}
          name="outcomeArea"
          placeholder="Strategic goal or funder report"
        />
      </label>
      <label className="block text-sm font-semibold">
        Target as displayed
        <Input
          className="mt-2"
          defaultValue={kpi?.targetDisplay ?? ""}
          maxLength={60}
          name="targetDisplay"
          placeholder=">= 70% or $1.5M"
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Target as number
        <Input
          className="mt-2"
          defaultValue={kpi?.targetNumber ?? ""}
          inputMode="decimal"
          name="targetNumber"
          pattern={positiveDecimalNumberPattern}
          placeholder="70 or 1500000"
          required
          title="Enter a number greater than zero, with up to 2 decimal places."
        />
        <FieldHint>Number greater than zero, up to 2 decimals. No currency symbols.</FieldHint>
      </label>
      <label className="block text-sm font-semibold">
        Baseline number
        <Input
          className="mt-2"
          defaultValue={kpi?.baselineNumber ?? ""}
          inputMode="decimal"
          name="baselineNumber"
          pattern={decimalNumberPattern}
          placeholder="Optional"
          title="Enter numbers only, with up to 2 decimal places."
        />
      </label>
    </div>
  );
}

function ArchiveKpiDefinitionDialog({
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
          aria-label={`Archive KPI ${kpi.name}`}
          size="icon"
          title="Archive KPI"
          variant="outline"
        >
          <Archive className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archive this KPI?</DialogTitle>
          <DialogDescription>
            &quot;{kpi.name}&quot; will be removed from all quarter tracker tabs
            and board reporting calculations. Existing historical records stay
            in the database for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <form action={archiveKpiDefinition} className="flex flex-wrap gap-3">
          <HiddenDashboard dashboardId={dashboardId} />
          <input type="hidden" name="kpiId" value={kpi.id} />
          <input type="hidden" name="quarter" value={quarter} />
          <SubmitButton pendingText="Archiving..." variant="destructive">
            Archive KPI
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuarterTrackerTab({
  data,
  quarter,
}: {
  data: KpiDashboardData;
  quarter: QuarterNumber;
}) {
  const quarterKpis = data.kpis.filter((kpi) =>
    data.assignments.some(
      (assignment) =>
        assignment.kpiId === kpi.id && assignment.quarter === quarter,
    ),
  );

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>KPI Staff Tracker — Q{quarter}</CardTitle>
          <CardDescription className="mt-2">
            {getQuarterMonths(data, quarter)}
          </CardDescription>
          <p className="mt-2 text-sm text-slate-600">
            Staff enter quarterly results from this table. Pale yellow fields are
            edited through modals; grey cells are calculated automatically from
            the KPI target and prior quarter.
          </p>
        </div>
        <AddQuarterResultDialog
          quarter={quarter}
        >
          <HiddenDashboard dashboardId={data.dashboard.id} />
          <input type="hidden" name="quarter" value={quarter} />
          <KpiDefinitionFields />
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Calculated fields</p>
            <p className="mt-1">
              Prior quarter, trend, % to target, variance, and Auto-RAG are
              calculated automatically after this result is saved.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Current value
              <Input
                className="mt-2 bg-amber-50"
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
                defaultValue="na"
                name="ragStatus"
                options={ragStatuses.map((status) => ({
                  label: ragLabels[status],
                  value: status,
                }))}
                placeholder="Choose status"
              />
              <FieldHint>
                Staff can override the Auto-RAG suggestion when context warrants.
              </FieldHint>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Notes / actions
            <Textarea
              className="mt-2 bg-amber-50"
              maxLength={1200}
              name="contextNotes"
              placeholder="Achievements, issues, data quality notes..."
            />
            <FieldHint>Keep notes concise. Maximum 1,200 characters.</FieldHint>
          </label>
        </AddQuarterResultDialog>
      </CardHeader>
      <CardContent>
        <div
          className="scrollbar-hide overflow-x-auto rounded-xl border"
          data-testid="kpi-quarter-table"
        >
          <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow className="bg-olea-green text-white hover:bg-olea-green">
                <TableHead className="text-white">Domain</TableHead>
                <TableHead className="text-white">KPI</TableHead>
                <TableHead className="text-white">Owner</TableHead>
                <TableHead className="text-white">Target</TableHead>
                <TableHead className="bg-amber-50 text-slate-800">
                  Current value
                </TableHead>
                <TableHead className="bg-slate-100 text-slate-800">
                  Prior quarter
                </TableHead>
                <TableHead className="bg-amber-50 text-slate-800">
                  RAG status
                </TableHead>
                <TableHead className="bg-slate-100 text-slate-800">
                  Trend
                </TableHead>
                <TableHead className="bg-slate-100 text-slate-800">
                  % to target
                </TableHead>
                <TableHead className="bg-slate-100 text-slate-800">
                  Variance vs target
                </TableHead>
                <TableHead className="bg-slate-100 text-slate-800">
                  Auto-RAG
                </TableHead>
                <TableHead className="bg-amber-50 text-slate-800">
                  Notes
                </TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quarterKpis.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-28 text-center text-slate-600"
                    colSpan={13}
                  >
                    Use the Add KPI button above to create the first Q{quarter}
                    tracker row.
                  </TableCell>
                </TableRow>
              ) : null}
              {quarterKpis.map((kpi) => {
                const result = getResult(data, kpi.id, quarter);
                const percent = calculatePercentToTarget(
                  result?.currentValue ?? null,
                  kpi.targetNumber,
                );
                const previousResult =
                  quarter > 1
                    ? getResult(data, kpi.id, (quarter - 1) as QuarterNumber)
                    : null;
                const previousValue = previousResult?.currentValue ?? null;
                const trend = calculateTrend(
                  result?.currentValue ?? null,
                  previousValue,
                );
                const autoRag = suggestRagStatus(
                  result?.currentValue ?? null,
                  kpi.targetNumber,
                );
                const variance = calculateVariance(
                  result?.currentValue ?? null,
                  kpi.targetNumber,
                );

                return (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-semibold text-slate-700">
                      {kpi.domain}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-950">
                        {kpi.name}
                      </div>
                    </TableCell>
                    <TableCell>{kpi.owner || "—"}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{kpi.targetDisplay}</span>
                      <div className="text-xs text-slate-500">
                        Number: {formatNumber(kpi.targetNumber)}
                      </div>
                    </TableCell>
                    <TableCell className="bg-amber-50/70 font-semibold">
                      {formatNumber(result?.currentValue)}
                    </TableCell>
                    <TableCell className="bg-slate-50">
                      {formatNumber(previousValue)}
                    </TableCell>
                    <TableCell className="bg-amber-50/70">
                      <RagBadge status={result?.ragStatus ?? "na"} />
                    </TableCell>
                    <TableCell className="bg-slate-50">
                      <TrendText trend={trend} />
                    </TableCell>
                    <TableCell className="bg-slate-50">
                      {formatPercent(percent)}
                    </TableCell>
                    <TableCell className="bg-slate-50">
                      {formatNumber(variance)}
                    </TableCell>
                    <TableCell className="bg-slate-50">
                      <RagBadge status={autoRag} />
                    </TableCell>
                    <TableCell className="bg-amber-50/70">
                      <span className="block max-w-[260px] truncate text-sm text-slate-700">
                        {result?.contextNotes || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
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
                                Update the KPI definition and Q{quarter} staff
                                result in one place. Definition changes apply to
                                every assigned quarter. Grey fields are
                                calculated automatically.
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              action={saveKpiQuarterResult}
                              className="space-y-4"
                            >
                              <HiddenDashboard dashboardId={data.dashboard.id} />
                              <input type="hidden" name="kpiId" value={kpi.id} />
                              <input
                                type="hidden"
                                name="quarter"
                                value={quarter}
                              />
                              <KpiDefinitionFields kpi={kpi} />
                              <CalculatedTrackerFields
                                autoRag={autoRag}
                                percent={percent}
                                previousValue={previousValue}
                                trend={trend}
                                variance={variance}
                              />
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-semibold">
                                  Current value
                                  <Input
                                    className="mt-2 bg-amber-50"
                                    defaultValue={result?.currentValue ?? ""}
                                    inputMode="decimal"
                                    name="currentValue"
                                    pattern={decimalNumberPattern}
                                    placeholder="Numbers only"
                                    title="Enter numbers only, with up to 2 decimal places."
                                  />
                                  <FieldHint>
                                    Use numbers only, with up to 2 decimals. Do
                                    not include currency symbols or percent signs.
                                  </FieldHint>
                                </label>
                                <label className="block text-sm font-semibold">
                                  RAG status
                                  <SelectField
                                    className="mt-2"
                                    defaultValue={result?.ragStatus ?? "na"}
                                    name="ragStatus"
                                    options={ragStatuses.map((status) => ({
                                      label: ragLabels[status],
                                      value: status,
                                    }))}
                                    placeholder="Choose status"
                                  />
                                  <FieldHint>
                                    Auto-RAG suggests {ragLabels[autoRag]}, but
                                    staff can override when context warrants.
                                  </FieldHint>
                                </label>
                              </div>
                              <label className="block text-sm font-semibold">
                                Notes / actions
                                <Textarea
                                  className="mt-2 bg-amber-50"
                                  defaultValue={result?.contextNotes ?? ""}
                                  maxLength={1200}
                                  name="contextNotes"
                                  placeholder="Achievements, issues, data quality notes..."
                                />
                                <FieldHint>
                                  Keep notes concise. Maximum 1,200 characters.
                                </FieldHint>
                              </label>
                              <SubmitButton pendingText="Saving KPI...">
                                Save KPI
                              </SubmitButton>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <ArchiveKpiDefinitionDialog
                          dashboardId={data.dashboard.id}
                          kpi={kpi}
                          quarter={quarter}
                        />
                        {result ? (
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
                                  This removes the current value, RAG status, and
                                  notes for &quot;{kpi.name}&quot; in Q{quarter}.
                                  The KPI definition stays in place.
                                </DialogDescription>
                              </DialogHeader>
                              <form
                                action={deleteKpiQuarterResult}
                                className="flex flex-wrap gap-3"
                              >
                                <HiddenDashboard dashboardId={data.dashboard.id} />
                                <input type="hidden" name="kpiId" value={kpi.id} />
                                <input
                                  type="hidden"
                                  name="quarter"
                                  value={quarter}
                                />
                                <SubmitButton
                                  pendingText="Clearing..."
                                  variant="destructive"
                                >
                                  Clear result
                                </SubmitButton>
                              </form>
                            </DialogContent>
                          </Dialog>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function BoardDashboardTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="space-y-5">
      <KpiSummaryCards data={data} />
      <Card>
        <CardHeader>
          <CardTitle>Full-year KPI results by quarter</CardTitle>
          <CardDescription>
            Quarterly results pull from the tracker tabs. The Board reviews the
            trend, progress, and variance before setting the full-year RAG.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.kpis.length === 0 ? (
            <EmptyState>No KPIs yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                RAG key: GREEN = on target, AMBER = needs attention, RED = off
                track, N/A = not enough data. Trend compares each quarter with
                the prior quarter when data is available.
              </p>
              <div
                className="scrollbar-hide overflow-x-auto rounded-xl border"
                data-testid="board-dashboard-table"
              >
                <Table className="min-w-[1680px]">
                  <caption className="sr-only">
                    Full-year KPI results by quarter
                  </caption>
                  <TableHeader>
                    <TableRow className="bg-slate-700 hover:bg-slate-700">
                      <TableHead
                        rowSpan={2}
                        scope="col"
                        className="border-r text-white"
                      >
                        Domain
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        scope="col"
                        className="border-r text-white"
                      >
                        KPI
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        scope="col"
                        className="border-r text-white"
                      >
                        Outcome
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        scope="col"
                        className="border-r text-white"
                      >
                        Target
                      </TableHead>
                      {quarterValues.map((quarter) => (
                        <TableHead
                          key={quarter}
                          colSpan={3}
                          scope="colgroup"
                          className="border-r text-white"
                        >
                          {getQuarterPeriodLabel(data, quarter)}
                        </TableHead>
                      ))}
                      <TableHead
                        rowSpan={2}
                        scope="col"
                        className="border-r text-white"
                      >
                        Progress % to target
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        scope="col"
                        className="border-r text-white"
                      >
                        Variance vs target
                      </TableHead>
                      <TableHead rowSpan={2} scope="col" className="text-white">
                        Full-year RAG
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-slate-700 hover:bg-slate-700">
                      {quarterValues.flatMap((quarter) => [
                        <TableHead
                          key={`q${quarter}-result`}
                          scope="col"
                          className="border-r text-white"
                        >
                          <span className="sr-only">Q{quarter} </span>
                          Result
                        </TableHead>,
                        <TableHead
                          key={`q${quarter}-trend`}
                          scope="col"
                          className="border-r text-white"
                        >
                          <span className="sr-only">Q{quarter} </span>
                          Trend
                        </TableHead>,
                        <TableHead
                          key={`q${quarter}-rag`}
                          scope="col"
                          className="border-r text-white"
                        >
                          <span className="sr-only">Q{quarter} </span>
                          RAG
                        </TableHead>,
                      ])}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.kpis.map((kpi) => {
                      const latestQuarterResult = getLatestQuarterResult(
                        data,
                        kpi.id,
                      );
                      const latestValue =
                        latestQuarterResult?.result.currentValue ?? null;
                      const progress = calculatePercentToTarget(
                        latestValue,
                        kpi.targetNumber,
                      );
                      const variance = calculateVariance(
                        latestValue,
                        kpi.targetNumber,
                      );
                      const assessment = getAssessment(data, kpi.id);

                      return (
                        <TableRow key={kpi.id}>
                          <TableCell className="border-r font-semibold">
                            {kpi.domain}
                          </TableCell>
                          <TableCell className="border-r font-semibold">
                            {kpi.name}
                          </TableCell>
                          <TableCell className="border-r">
                            {kpi.outcomeArea || "—"}
                          </TableCell>
                          <TableCell className="border-r">
                            {kpi.targetDisplay || formatNumber(kpi.targetNumber)}
                          </TableCell>
                          {quarterValues.map((quarter) => {
                            const result = getResult(data, kpi.id, quarter);
                            const previousResult =
                              quarter === 1
                                ? null
                                : getResult(
                                    data,
                                    kpi.id,
                                    (quarter - 1) as QuarterNumber,
                                  );
                            const trend = calculateTrend(
                              result?.currentValue ?? null,
                              previousResult?.currentValue ?? null,
                            );

                            return (
                              <React.Fragment key={quarter}>
                                <TableCell className="border-r">
                                  {formatNumber(result?.currentValue)}
                                </TableCell>
                                <TableCell className="border-r">
                                  <TrendText trend={trend} />
                                </TableCell>
                                <TableCell className="border-r">
                                  <RagBadge status={result?.ragStatus ?? "na"} />
                                </TableCell>
                              </React.Fragment>
                            );
                          })}
                          <TableCell className="border-r font-semibold">
                            <span>{formatPercent(progress)}</span>
                            {latestQuarterResult ? (
                              <span className="mt-1 block text-xs font-normal text-slate-500">
                                Latest: Q{latestQuarterResult.quarter}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="border-r">
                            <VarianceValue value={variance} />
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <form
                              action={saveKpiBoardAssessment}
                              className="flex items-center gap-2"
                            >
                              <HiddenDashboard dashboardId={data.dashboard.id} />
                              <input type="hidden" name="kpiId" value={kpi.id} />
                              <SelectField
                                ariaLabel={`Full-year RAG for ${kpi.name}`}
                                className="w-[130px]"
                                defaultValue={assessment?.fullYearRag ?? "na"}
                                name="fullYearRag"
                                options={ragStatuses.map((status) => ({
                                  label: ragLabels[status],
                                  value: status,
                                }))}
                                placeholder="Choose status"
                              />
                              <SubmitButton pendingText="Saving..." size="sm">
                                Save
                              </SubmitButton>
                            </form>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TruncatedTableText({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[340px] truncate text-sm text-slate-500">
      {children || "—"}
    </p>
  );
}

function MilestonesAndRisksTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>
                Track completion milestones and board reporting checkpoints.
              </CardDescription>
            </div>
            <MilestoneDialogAction dashboardId={data.dashboard.id} />
          </div>
        </CardHeader>
        <CardContent>
          {data.milestones.length === 0 ? (
            <EmptyState>No milestones yet.</EmptyState>
          ) : (
            <div
              className="scrollbar-hide overflow-x-auto rounded-xl border"
              data-testid="kpi-milestones-table"
            >
              <Table>
                <caption className="sr-only">
                  KPI dashboard milestone list with owner, due date, status, notes, and
                  row actions.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.milestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-semibold">
                        {milestone.title}
                      </TableCell>
                      <TableCell>{milestone.owner || "—"}</TableCell>
                      <TableCell>{milestone.dueDate ?? "—"}</TableCell>
                      <TableCell>{milestoneLabels[milestone.status]}</TableCell>
                      <TableCell>
                        <TruncatedTableText>{milestone.notes}</TruncatedTableText>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <MilestoneDialogAction
                            dashboardId={data.dashboard.id}
                            milestone={milestone}
                          />
                          <DeleteMilestoneDialogAction
                            dashboardId={data.dashboard.id}
                            milestone={milestone}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Risk register</CardTitle>
              <CardDescription>
                Capture board-visible risks, mitigations, ownership, and RAG
                status.
              </CardDescription>
            </div>
            <RiskDialogAction dashboardId={data.dashboard.id} />
          </div>
        </CardHeader>
        <CardContent>
          {data.risks.length === 0 ? (
            <EmptyState>No risks yet.</EmptyState>
          ) : (
            <div
              className="scrollbar-hide overflow-x-auto rounded-xl border"
              data-testid="kpi-risks-table"
            >
              <Table>
                <caption className="sr-only">
                  KPI dashboard risk register with area, risk, mitigation, owner, RAG
                  status, and row actions.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Area</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Mitigation</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>RAG</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.risks.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell className="font-semibold">{risk.area}</TableCell>
                      <TableCell>
                        <TruncatedTableText>{risk.description}</TruncatedTableText>
                      </TableCell>
                      <TableCell>
                        <TruncatedTableText>{risk.mitigation}</TruncatedTableText>
                      </TableCell>
                      <TableCell>{risk.owner || "—"}</TableCell>
                      <TableCell>
                        <RagBadge status={risk.ragStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <RiskDialogAction
                            dashboardId={data.dashboard.id}
                            risk={risk}
                          />
                          <DeleteRiskDialogAction
                            dashboardId={data.dashboard.id}
                            risk={risk}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnnualSummaryTab({ data }: { data: KpiDashboardData }) {
  const fields = [
    ["overview", "Overview"],
    ["achievements", "Key achievements"],
    ["challenges", "Challenges and learning"],
    ["stakeholderStory", "Stakeholder story"],
    ["financialContext", "Financial context"],
    ["riskResponse", "Risk response"],
    ["nextSteps", "Next steps"],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Summary</CardTitle>
        <p className="text-sm text-slate-600">
          These narrative sections prepare the content for annual impact reporting.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={saveKpiAnnualSummary}
          className="grid gap-4 md:grid-cols-2"
          data-testid="annual-summary-form"
        >
          <HiddenDashboard dashboardId={data.dashboard.id} />
          {fields.map(([name, label]) => (
            <label className="block text-sm font-semibold" key={name}>
              {label}
              <Textarea
                className="mt-2"
                defaultValue={data.annualSummary[name]}
                maxLength={2000}
                name={name}
                placeholder={`Write ${label.toLowerCase()}...`}
              />
            </label>
          ))}
          <SubmitButton className="md:col-span-2" pendingText="Saving summary...">
            <Save className="h-4 w-4" />
            Save annual summary
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function KpiDashboardWorkspace({
  activeTab,
  data,
}: {
  activeTab: string;
  data: KpiDashboardData;
}) {
  const safeTab = tabOptions.some((tab) => tab.value === activeTab)
    ? activeTab
    : "setup";

  return (
    <div className="space-y-5">
      <Card className="border-olea-green/15 bg-gradient-to-br from-white to-olea-light/50 shadow-soft">
        <CardContent className="p-5">
          <div className="space-y-5">
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href="/templates">
                <ArrowLeft className="h-4 w-4" />
                Back to resources
              </Link>
            </Button>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-olea-green">
                  Board reporting
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-4xl">
                  {data.dashboard.title}
                </h1>
                <p className="mt-3 max-w-4xl text-lg leading-8 text-slate-600">
                  Define KPIs, customize reporting quarters, capture quarterly
                  results, and prepare board-ready annual reporting from one
                  connected workspace.
                </p>
                <p className="mt-3 text-slate-600">
                  {data.dashboard.organizationName} · Reporting year{" "}
                  {data.dashboard.reportingYear}
                </p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                {data.kpis.length} KPI{data.kpis.length === 1 ? "" : "s"} tracked
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={safeTab}>
        <nav
          aria-label="KPI dashboard sections"
          className="scrollbar-hide overflow-x-auto rounded-xl border bg-white p-2 shadow-soft"
          data-testid="kpi-dashboard-tabs"
        >
          <div className="flex h-auto min-w-max justify-start gap-1 rounded-lg bg-olea-light/70 p-1">
            {tabOptions.map((tab) => (
              <Link
                aria-current={safeTab === tab.value ? "page" : undefined}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  safeTab === tab.value
                    ? "bg-white text-olea-green shadow-sm"
                    : "text-muted-foreground hover:bg-white/60",
                )}
                href={`/modules/kpi-dashboard?tab=${tab.value}`}
                key={tab.value}
              >
                {tab.value === "settings" && (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                {tab.value === "board" && <BarChart3 className="mr-2 h-4 w-4" />}
                {tab.value === "milestones" && (
                  <ClipboardList className="mr-2 h-4 w-4" />
                )}
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>

        <TabsContent value="setup">
          <SetupTab data={data} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab data={data} />
        </TabsContent>
        {quarterValues.map((quarter) => (
          <TabsContent key={quarter} value={`q${quarter}`}>
            <QuarterTrackerTab data={data} quarter={quarter} />
          </TabsContent>
        ))}
        <TabsContent value="board">
          <BoardDashboardTab data={data} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesAndRisksTab data={data} />
        </TabsContent>
        <TabsContent value="annual">
          <AnnualSummaryTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
