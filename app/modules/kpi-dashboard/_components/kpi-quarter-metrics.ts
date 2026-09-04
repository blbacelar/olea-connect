import type { KpiDashboardData, KpiDefinition } from "@/lib/data/kpi-dashboard";
import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  suggestRagStatus,
  type QuarterNumber,
} from "@/lib/kpi-dashboard/domain";

import { getResult } from "./kpi-dashboard-ui";

export type QuarterMetrics = ReturnType<typeof getQuarterMetrics>;

export function getQuarterMetrics(
  data: KpiDashboardData,
  kpi: KpiDefinition,
  quarter: QuarterNumber,
) {
  const result = getResult(data, kpi.id, quarter);
  const currentValue = result?.currentValue ?? null;
  const previousResult =
    quarter > 1 ? getResult(data, kpi.id, (quarter - 1) as QuarterNumber) : null;
  const previousValue = previousResult?.currentValue ?? null;

  return {
    autoRag: suggestRagStatus(currentValue, kpi.targetNumber),
    percent: calculatePercentToTarget(currentValue, kpi.targetNumber),
    previousValue,
    result,
    trend: calculateTrend(currentValue, previousValue),
    variance: calculateVariance(currentValue, kpi.targetNumber),
  };
}
