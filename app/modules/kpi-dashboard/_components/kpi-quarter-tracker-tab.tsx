import { AddQuarterResultDialog } from "@/app/modules/kpi-dashboard/_components/add-quarter-result-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KpiDashboardData, KpiDefinition } from "@/lib/data/kpi-dashboard";
import {
  formatNumber,
  formatPercent,
  type QuarterNumber,
} from "@/lib/kpi-dashboard/domain";

import {
  ArchiveKpiDefinitionDialog,
  KpiDefinitionFields,
} from "./kpi-definition-fields";
import {
  HiddenDashboard,
  RagBadge,
  TrendText,
  getQuarterMonths,
} from "./kpi-dashboard-ui";
import { getQuarterMetrics, type QuarterMetrics } from "./kpi-quarter-metrics";
import {
  CalculatedFieldsNotice,
  DeleteQuarterResultDialog,
  EditQuarterResultDialog,
  QuarterNotesField,
  QuarterResultFields,
} from "./kpi-quarter-result-dialogs";

export function QuarterTrackerTab({
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
        <QuarterTrackerHeader data={data} quarter={quarter} />
        <AddQuarterKpiDialog data={data} quarter={quarter} />
      </CardHeader>
      <CardContent>
        <QuarterTrackerTable data={data} kpis={quarterKpis} quarter={quarter} />
      </CardContent>
    </Card>
  );
}

function QuarterTrackerHeader({
  data,
  quarter,
}: {
  data: KpiDashboardData;
  quarter: QuarterNumber;
}) {
  return (
    <div>
      <CardTitle>KPI Staff Tracker — Q{quarter}</CardTitle>
      <CardDescription className="mt-2">
        {getQuarterMonths(data, quarter)}
      </CardDescription>
      <p className="mt-2 text-sm text-slate-600">
        Staff enter quarterly results from this table. Pale yellow fields are
        edited through modals; grey cells are calculated automatically from the
        KPI target and prior quarter.
      </p>
    </div>
  );
}

function AddQuarterKpiDialog({
  data,
  quarter,
}: {
  data: KpiDashboardData;
  quarter: QuarterNumber;
}) {
  return (
    <AddQuarterResultDialog quarter={quarter}>
      <HiddenDashboard dashboardId={data.dashboard.id} />
      <input type="hidden" name="quarter" value={quarter} />
      <KpiDefinitionFields />
      <CalculatedFieldsNotice />
      <QuarterResultFields autoRag="na" />
      <QuarterNotesField />
    </AddQuarterResultDialog>
  );
}

function QuarterTrackerTable({
  data,
  kpis,
  quarter,
}: {
  data: KpiDashboardData;
  kpis: KpiDefinition[];
  quarter: QuarterNumber;
}) {
  return (
    <div
      className="scrollbar-hide overflow-x-auto rounded-xl border"
      data-testid="kpi-quarter-table"
    >
      <Table className="min-w-[1400px]">
        <QuarterTrackerTableHeader />
        <TableBody>
          {kpis.length === 0 ? <EmptyQuarterRow quarter={quarter} /> : null}
          {kpis.map((kpi) => (
            <QuarterTrackerRow
              data={data}
              key={kpi.id}
              kpi={kpi}
              quarter={quarter}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function QuarterTrackerTableHeader() {
  const calculatedHeaders = [
    "Prior quarter",
    "Trend",
    "% to target",
    "Variance vs target",
    "Auto-RAG",
  ];

  return (
    <TableHeader>
      <TableRow className="bg-olea-green text-white hover:bg-olea-green">
        <TableHead className="text-white">Domain</TableHead>
        <TableHead className="text-white">KPI</TableHead>
        <TableHead className="text-white">Owner</TableHead>
        <TableHead className="text-white">Target</TableHead>
        <TableHead className="bg-amber-50 text-slate-800">Current value</TableHead>
        {calculatedHeaders.map((label) => (
          <TableHead className="bg-slate-100 text-slate-800" key={label}>
            {label}
          </TableHead>
        ))}
        <TableHead className="bg-amber-50 text-slate-800">RAG status</TableHead>
        <TableHead className="bg-amber-50 text-slate-800">Notes</TableHead>
        <TableHead className="text-right text-white">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function QuarterTrackerRow({
  data,
  kpi,
  quarter,
}: {
  data: KpiDashboardData;
  kpi: KpiDefinition;
  quarter: QuarterNumber;
}) {
  const metrics = getQuarterMetrics(data, kpi, quarter);

  return (
    <TableRow>
      <TableCell className="font-semibold text-slate-700">{kpi.domain}</TableCell>
      <TableCell>
        <div className="font-semibold text-slate-950">{kpi.name}</div>
      </TableCell>
      <TableCell>{kpi.owner || "—"}</TableCell>
      <TableCell>
        <span className="font-semibold">{kpi.targetDisplay}</span>
        <div className="text-xs text-slate-500">
          Number: {formatNumber(kpi.targetNumber)}
        </div>
      </TableCell>
      <TableCell className="bg-amber-50/70 font-semibold">
        {formatNumber(metrics.result?.currentValue)}
      </TableCell>
      <TableCell className="bg-slate-50">
        {formatNumber(metrics.previousValue)}
      </TableCell>
      <TableCell className="bg-slate-50">
        <TrendText trend={metrics.trend} />
      </TableCell>
      <TableCell className="bg-slate-50">
        {formatPercent(metrics.percent)}
      </TableCell>
      <TableCell className="bg-slate-50">
        {formatNumber(metrics.variance)}
      </TableCell>
      <TableCell className="bg-slate-50">
        <RagBadge status={metrics.autoRag} />
      </TableCell>
      <TableCell className="bg-amber-50/70">
        <RagBadge status={metrics.result?.ragStatus ?? "na"} />
      </TableCell>
      <TableCell className="bg-amber-50/70">
        <span className="block max-w-[260px] truncate text-sm text-slate-700">
          {metrics.result?.contextNotes || "—"}
        </span>
      </TableCell>
      <TableCell>
        <QuarterRowActions data={data} kpi={kpi} metrics={metrics} quarter={quarter} />
      </TableCell>
    </TableRow>
  );
}

function QuarterRowActions({
  data,
  kpi,
  metrics,
  quarter,
}: {
  data: KpiDashboardData;
  kpi: KpiDefinition;
  metrics: QuarterMetrics;
  quarter: QuarterNumber;
}) {
  return (
    <div className="flex justify-end gap-2">
      <EditQuarterResultDialog
        dashboardId={data.dashboard.id}
        kpi={kpi}
        metrics={metrics}
        quarter={quarter}
      />
      <ArchiveKpiDefinitionDialog
        dashboardId={data.dashboard.id}
        kpi={kpi}
        quarter={quarter}
      />
      {metrics.result ? (
        <DeleteQuarterResultDialog
          dashboardId={data.dashboard.id}
          kpi={kpi}
          quarter={quarter}
        />
      ) : null}
    </div>
  );
}

function EmptyQuarterRow({ quarter }: { quarter: QuarterNumber }) {
  return (
    <TableRow>
      <TableCell className="h-28 text-center text-slate-600" colSpan={13}>
        Use the Add KPI button above to create the first Q{quarter} tracker row.
      </TableCell>
    </TableRow>
  );
}
