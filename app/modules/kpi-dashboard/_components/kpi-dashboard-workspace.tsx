import {
  Archive,
  BarChart3,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";

import {
  archiveKpiDefinition,
  createKpiMilestone,
  createKpiRisk,
  createKpiTrackerEntry,
  deleteKpiMilestone,
  deleteKpiQuarterResult,
  deleteKpiRisk,
  resetKpiQuarterSettings,
  saveKpiAnnualSummary,
  saveKpiBoardAssessment,
  saveKpiQuarterResult,
  updateKpiDashboardSettings,
  updateKpiQuarterSettings,
} from "@/app/modules/kpi-dashboard/actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { KpiDashboardData, KpiDefinition } from "@/lib/data/kpi-dashboard";
import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  decimalNumberPattern,
  formatNumber,
  formatPercent,
  milestoneLabels,
  milestoneStatuses,
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
  { value: "setup", label: "Setup & Branding" },
  { value: "settings", label: "Settings" },
  { value: "q1", label: "Q1 Tracker" },
  { value: "q2", label: "Q2 Tracker" },
  { value: "q3", label: "Q3 Tracker" },
  { value: "q4", label: "Q4 Tracker" },
  { value: "board", label: "Board Dashboard" },
  { value: "milestones", label: "Milestones & Risks" },
  { value: "annual", label: "Annual Summary" },
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
        Organization name
        <Input
          className="mt-2"
          defaultValue={data.dashboard.organizationName}
          maxLength={140}
          name="organizationName"
          required
        />
      </label>
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
          Update organization, report title, reporting year, and fiscal year
          details. KPIs are added from the Q1-Q4 tracker tabs.
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

function AddQuarterResultDialog({
  dashboardId,
  quarter,
}: {
  dashboardId: string;
  quarter: QuarterNumber;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add KPI to Q{quarter}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add KPI to Q{quarter}</DialogTitle>
          <DialogDescription>
            Define the KPI and enter the staff-reported result for this quarter.
            The KPI will then appear in every tracker tab.
          </DialogDescription>
        </DialogHeader>
        <form action={createKpiTrackerEntry} className="space-y-5">
          <HiddenDashboard dashboardId={dashboardId} />
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
          <SubmitButton pendingText="Adding KPI...">Add KPI</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
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
          dashboardId={data.dashboard.id}
          quarter={quarter}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border">
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
              {data.kpis.length === 0 ? (
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
              {data.kpis.map((kpi) => {
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
                                result in one place. Grey fields are calculated
                                automatically.
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
          <CardTitle>Board dashboard</CardTitle>
          <p className="text-sm text-slate-600">
            Quarterly values are pulled from tracker tabs. The Board sets the
            full-year RAG and notes.
          </p>
        </CardHeader>
        <CardContent>
          {data.kpis.length === 0 ? (
            <EmptyState>No KPIs yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Q1</TableHead>
                  <TableHead>Q2</TableHead>
                  <TableHead>Q3</TableHead>
                  <TableHead>Q4</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Full-year RAG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.kpis.map((kpi) => {
                  const q4Value = getResult(data, kpi.id, 4)?.currentValue ?? null;
                  const variance = calculateVariance(q4Value, kpi.targetNumber);
                  const assessment = getAssessment(data, kpi.id);
                  return (
                    <TableRow key={kpi.id}>
                      <TableCell>
                        <p className="font-semibold">{kpi.name}</p>
                        <p className="text-xs text-slate-500">{kpi.domain}</p>
                      </TableCell>
                      {quarterValues.map((quarter) => (
                        <TableCell key={quarter}>
                          {formatNumber(getResult(data, kpi.id, quarter)?.currentValue)}
                        </TableCell>
                      ))}
                      <TableCell>{formatNumber(variance)}</TableCell>
                      <TableCell className="min-w-[260px]">
                        <form action={saveKpiBoardAssessment} className="space-y-2">
                          <HiddenDashboard dashboardId={data.dashboard.id} />
                          <input type="hidden" name="kpiId" value={kpi.id} />
                          <SelectField
                            defaultValue={assessment?.fullYearRag ?? "na"}
                            name="fullYearRag"
                            options={ragStatuses.map((status) => ({
                              label: ragLabels[status],
                              value: status,
                            }))}
                            placeholder="Choose status"
                          />
                          <Textarea
                            defaultValue={assessment?.boardNotes ?? ""}
                            maxLength={1200}
                            name="boardNotes"
                            placeholder="Board context or override rationale"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MilestonesAndRisksTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add milestone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKpiMilestone} className="space-y-4">
            <HiddenDashboard dashboardId={data.dashboard.id} />
            <Input maxLength={160} minLength={2} name="title" placeholder="Milestone" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input maxLength={100} name="owner" placeholder="Owner" />
              <Input name="dueDate" type="date" />
            </div>
            <SelectField
              defaultValue="not_started"
              name="status"
              options={milestoneStatuses.map((status) => ({
                label: milestoneLabels[status],
                value: status,
              }))}
              placeholder="Choose status"
            />
            <Textarea maxLength={1200} name="notes" placeholder="Notes" />
            <SubmitButton pendingText="Adding milestone...">
              Add milestone
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add risk</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKpiRisk} className="space-y-4">
            <HiddenDashboard dashboardId={data.dashboard.id} />
            <Input maxLength={100} minLength={2} name="area" placeholder="Risk area" required />
            <Textarea
              maxLength={600}
              minLength={3}
              name="description"
              placeholder="Risk description"
              required
            />
            <Textarea maxLength={1200} name="mitigation" placeholder="Mitigation" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input maxLength={100} name="owner" placeholder="Owner" />
              <SelectField
                defaultValue="na"
                name="ragStatus"
                options={ragStatuses.map((status) => ({
                  label: ragLabels[status],
                  value: status,
                }))}
                placeholder="Choose RAG"
              />
            </div>
            <SubmitButton pendingText="Adding risk...">Add risk</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {data.milestones.length === 0 ? (
            <EmptyState>No milestones yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.milestones.map((milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell>
                      <p className="font-semibold">{milestone.title}</p>
                      <p className="text-xs text-slate-500">{milestone.owner || "—"}</p>
                    </TableCell>
                    <TableCell>{milestone.dueDate ?? "—"}</TableCell>
                    <TableCell>{milestoneLabels[milestone.status]}</TableCell>
                    <TableCell>
                      <form action={deleteKpiMilestone}>
                        <HiddenDashboard dashboardId={data.dashboard.id} />
                        <input
                          type="hidden"
                          name="milestoneId"
                          value={milestone.id}
                        />
                        <SubmitButton
                          pendingText="Deleting..."
                          size="sm"
                          variant="outline"
                        >
                          Delete
                        </SubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Risk register</CardTitle>
        </CardHeader>
        <CardContent>
          {data.risks.length === 0 ? (
            <EmptyState>No risks yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>RAG</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.risks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-semibold">{risk.area}</TableCell>
                    <TableCell>
                      <p>{risk.description}</p>
                      <p className="text-xs text-slate-500">
                        Mitigation: {risk.mitigation || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <RagBadge status={risk.ragStatus} />
                    </TableCell>
                    <TableCell>
                      <form action={deleteKpiRisk}>
                        <HiddenDashboard dashboardId={data.dashboard.id} />
                        <input type="hidden" name="riskId" value={risk.id} />
                        <SubmitButton
                          pendingText="Deleting..."
                          size="sm"
                          variant="outline"
                        >
                          Delete
                        </SubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <form action={saveKpiAnnualSummary} className="space-y-4">
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
          <SubmitButton pendingText="Saving summary...">
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-olea-green">
                KPI Dashboard
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                {data.dashboard.title}
              </h2>
              <p className="mt-2 text-slate-600">
                {data.dashboard.organizationName} · Reporting year{" "}
                {data.dashboard.reportingYear}
              </p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              {data.kpis.length} KPI{data.kpis.length === 1 ? "" : "s"} tracked
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={safeTab}>
        <div className="overflow-x-auto rounded-xl border bg-white p-2 shadow-soft">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-olea-light/70 p-1">
            {tabOptions.map((tab) => (
              <TabsTrigger
                className="data-[state=active]:bg-white data-[state=active]:text-olea-green"
                key={tab.value}
                value={tab.value}
              >
                {tab.value === "settings" && <Settings className="mr-2 h-4 w-4" />}
                {tab.value === "board" && <BarChart3 className="mr-2 h-4 w-4" />}
                {tab.value === "milestones" && (
                  <ClipboardList className="mr-2 h-4 w-4" />
                )}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
