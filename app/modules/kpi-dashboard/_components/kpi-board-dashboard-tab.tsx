import * as React from "react";

import { saveKpiBoardAssessment } from "@/app/modules/kpi-dashboard/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
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
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  formatNumber,
  formatPercent,
  ragLabels,
  ragStatuses,
  type QuarterNumber,
} from "@/lib/kpi-dashboard/domain";

import {
  EmptyState,
  HiddenDashboard,
  KpiSummaryCards,
  RagBadge,
  SelectField,
  TrendText,
  VarianceValue,
  getAssessment,
  getLatestQuarterResult,
  getQuarterPeriodLabel,
  getResult,
  quarterValues,
} from "./kpi-dashboard-ui";

export function BoardDashboardTab({ data }: { data: KpiDashboardData }) {
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
          {data.kpis.length === 0 ? <EmptyState>No KPIs yet.</EmptyState> : null}
          {data.kpis.length > 0 ? <BoardDashboardTable data={data} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function BoardDashboardTable({ data }: { data: KpiDashboardData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        RAG key: GREEN = on target, AMBER = needs attention, RED = off track,
        N/A = not enough data. Trend compares each quarter with the prior quarter
        when data is available.
      </p>
      <div
        className="scrollbar-hide overflow-x-auto rounded-xl border"
        data-testid="board-dashboard-table"
      >
        <Table className="min-w-[1680px]">
          <caption className="sr-only">Full-year KPI results by quarter</caption>
          <BoardDashboardTableHeader data={data} />
          <TableBody>
            {data.kpis.map((kpi) => (
              <BoardDashboardRow data={data} key={kpi.id} kpi={kpi} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BoardDashboardTableHeader({ data }: { data: KpiDashboardData }) {
  return (
    <TableHeader>
      <TableRow className="bg-slate-700 hover:bg-slate-700">
        {["Domain", "KPI", "Outcome", "Target"].map((label) => (
          <TableHead key={label} rowSpan={2} scope="col" className="border-r text-white">
            {label}
          </TableHead>
        ))}
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
        <TableHead rowSpan={2} scope="col" className="border-r text-white">
          Progress % to target
        </TableHead>
        <TableHead rowSpan={2} scope="col" className="border-r text-white">
          Variance vs target
        </TableHead>
        <TableHead rowSpan={2} scope="col" className="text-white">
          Full-year RAG
        </TableHead>
      </TableRow>
      <TableRow className="bg-slate-700 hover:bg-slate-700">
        {quarterValues.flatMap((quarter) =>
          ["Result", "Trend", "RAG"].map((label) => (
            <TableHead
              key={`q${quarter}-${label}`}
              scope="col"
              className="border-r text-white"
            >
              <span className="sr-only">Q{quarter} </span>
              {label}
            </TableHead>
          )),
        )}
      </TableRow>
    </TableHeader>
  );
}

function BoardDashboardRow({
  data,
  kpi,
}: {
  data: KpiDashboardData;
  kpi: KpiDefinition;
}) {
  const latestQuarterResult = getLatestQuarterResult(data, kpi.id);
  const latestValue = latestQuarterResult?.result.currentValue ?? null;
  const progress = calculatePercentToTarget(latestValue, kpi.targetNumber);
  const variance = calculateVariance(latestValue, kpi.targetNumber);
  const assessment = getAssessment(data, kpi.id);

  return (
    <TableRow>
      <TableCell className="border-r font-semibold">{kpi.domain}</TableCell>
      <TableCell className="border-r font-semibold">{kpi.name}</TableCell>
      <TableCell className="border-r">{kpi.outcomeArea || "—"}</TableCell>
      <TableCell className="border-r">
        {kpi.targetDisplay || formatNumber(kpi.targetNumber)}
      </TableCell>
      {quarterValues.map((quarter) => (
        <QuarterResultCells data={data} key={quarter} kpi={kpi} quarter={quarter} />
      ))}
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
        <FullYearRagForm
          dashboardId={data.dashboard.id}
          fullYearRag={assessment?.fullYearRag ?? "na"}
          kpi={kpi}
        />
      </TableCell>
    </TableRow>
  );
}

function QuarterResultCells({
  data,
  kpi,
  quarter,
}: {
  data: KpiDashboardData;
  kpi: KpiDefinition;
  quarter: QuarterNumber;
}) {
  const result = getResult(data, kpi.id, quarter);
  const previousResult =
    quarter === 1 ? null : getResult(data, kpi.id, (quarter - 1) as QuarterNumber);
  const trend = calculateTrend(
    result?.currentValue ?? null,
    previousResult?.currentValue ?? null,
  );

  return (
    <React.Fragment>
      <TableCell className="border-r">{formatNumber(result?.currentValue)}</TableCell>
      <TableCell className="border-r">
        <TrendText trend={trend} />
      </TableCell>
      <TableCell className="border-r">
        <RagBadge status={result?.ragStatus ?? "na"} />
      </TableCell>
    </React.Fragment>
  );
}

function FullYearRagForm({
  dashboardId,
  fullYearRag,
  kpi,
}: {
  dashboardId: string;
  fullYearRag: string;
  kpi: KpiDefinition;
}) {
  return (
    <form action={saveKpiBoardAssessment} className="flex items-center gap-2">
      <HiddenDashboard dashboardId={dashboardId} />
      <input type="hidden" name="kpiId" value={kpi.id} />
      <SelectField
        ariaLabel={`Full-year RAG for ${kpi.name}`}
        className="w-[130px]"
        defaultValue={fullYearRag}
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
  );
}
