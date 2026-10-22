import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KpiDashboardData } from "@/lib/data/kpi-dashboard";
import {
  calculateTrend,
  formatNumber,
  monthOptions,
  ragLabels,
  type QuarterNumber,
  type RagStatus,
} from "@/lib/kpi-dashboard/domain";
import { cn } from "@/lib/utils";

export const quarterValues: QuarterNumber[] = [1, 2, 3, 4];

export function HiddenDashboard({ dashboardId }: { dashboardId: string }) {
  return <input type="hidden" name="dashboardId" value={dashboardId} />;
}

export function SelectField({
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

export function RagBadge({ status }: { status: RagStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        status === "amber" && "bg-amber-100 text-amber-800",
        status === "green" && "bg-green-100 text-green-800",
        status === "na" && "bg-slate-100 text-slate-600",
        status === "red" && "bg-red-100 text-red-800",
      )}
    >
      {ragLabels[status]}
    </Badge>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-5 text-slate-500">{children}</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-600">
      {children}
    </div>
  );
}

export function getResult(
  data: KpiDashboardData,
  kpiId: string,
  quarter: QuarterNumber,
) {
  return data.results.find(
    (result) => result.kpiId === kpiId && result.quarter === quarter,
  );
}

export function getAssessment(data: KpiDashboardData, kpiId: string) {
  return data.assessments.find((assessment) => assessment.kpiId === kpiId);
}

export function getQuarterMonths(data: KpiDashboardData, quarter: QuarterNumber) {
  const monthNames = data.quarters
    .filter((assignment) => assignment.quarter === quarter)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((assignment) => {
      const month = monthOptions.find(
        (option) => option.value === assignment.monthNumber,
      );
      return month ? [month.label] : [];
    });

  return monthNames.length > 0 ? monthNames.join(", ") : "No months assigned";
}

export function getQuarterPeriodLabel(
  data: KpiDashboardData,
  quarter: QuarterNumber,
) {
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
    const labels = quarterMonths.map((month) => month.label).join(", ");
    return `Q${quarter} · ${labels}`;
  }

  return `Q${quarter} · ${quarterMonths[0].label} – ${quarterMonths.at(-1)?.label}`;
}

export function getLatestQuarterResult(data: KpiDashboardData, kpiId: string) {
  for (const quarter of [...quarterValues].reverse()) {
    const result = getResult(data, kpiId, quarter);
    if (result !== undefined && result.currentValue !== null) {
      return { quarter, result };
    }
  }

  return null;
}

export function VarianceValue({ value }: { value: number | null }) {
  return (
    <span className={cn("font-semibold", value === null && "text-slate-500")}>
      {formatNumber(value)}
    </span>
  );
}

export function TrendText({ trend }: { trend: ReturnType<typeof calculateTrend> }) {
  const trendCopy = {
    declining: { className: "text-red-700", label: "Declining" },
    improving: { className: "text-green-700", label: "Improving" },
    not_available: { className: "text-slate-500", label: "—" },
    stable: { className: "text-amber-700", label: "Stable" },
  }[trend];

  return (
    <span className={cn("font-semibold", trendCopy.className)}>
      {trendCopy.label}
    </span>
  );
}

export function KpiSummaryCards({ data }: { data: KpiDashboardData }) {
  const fullYearStatuses = data.kpis.map(
    (kpi) => getAssessment(data, kpi.id)?.fullYearRag ?? "na",
  );
  const scorecard = {
    amber: fullYearStatuses.filter((status) => status === "amber").length,
    green: fullYearStatuses.filter((status) => status === "green").length,
    red: fullYearStatuses.filter((status) => status === "red").length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard label="KPIs" value={data.kpis.length} />
      <SummaryCard label="Green" value={scorecard.green} labelClassName="text-green-700" />
      <SummaryCard label="Amber" value={scorecard.amber} labelClassName="text-amber-700" />
      <SummaryCard label="Red" value={scorecard.red} labelClassName="text-red-700" />
    </div>
  );
}

function SummaryCard({
  label,
  labelClassName = "text-slate-500",
  value,
}: {
  label: string;
  labelClassName?: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.12em]",
            labelClassName,
          )}
        >
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
