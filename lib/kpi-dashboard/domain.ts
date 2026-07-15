export const monthOptions = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
] as const;

export const decimalNumberPattern = String.raw`\d+(\.\d{1,2})?`;
const decimalNumberRegex = new RegExp(`^${decimalNumberPattern}$`);

export const ragStatuses = ["green", "amber", "red", "na"] as const;
export type RagStatus = (typeof ragStatuses)[number];

export const milestoneStatuses = [
  "not_started",
  "in_progress",
  "complete",
  "at_risk",
] as const;
export type MilestoneStatus = (typeof milestoneStatuses)[number];

export type QuarterNumber = 1 | 2 | 3 | 4;

export type QuarterMonthAssignment = {
  monthNumber: number;
  quarter: QuarterNumber;
  sortOrder: number;
};

export type TrendDirection = "improving" | "declining" | "stable" | "not_available";

export const ragLabels: Record<RagStatus, string> = {
  green: "GREEN",
  amber: "AMBER",
  red: "RED",
  na: "N/A",
};

export const milestoneLabels: Record<MilestoneStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
  at_risk: "At Risk",
};

export function defaultQuarterAssignments(): QuarterMonthAssignment[] {
  return monthOptions.map((month, index) => ({
    monthNumber: month.value,
    quarter: (Math.floor(index / 3) + 1) as QuarterNumber,
    sortOrder: index + 1,
  }));
}

export function validateQuarterAssignments(assignments: QuarterMonthAssignment[]) {
  const errors: string[] = [];
  const monthSet = new Set<number>();
  const quarterCounts = new Map<QuarterNumber, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);

  for (const assignment of assignments) {
    if (!monthOptions.some((month) => month.value === assignment.monthNumber)) {
      errors.push(`Month ${assignment.monthNumber} is not valid.`);
    }
    if (![1, 2, 3, 4].includes(assignment.quarter)) {
      errors.push(`Quarter ${assignment.quarter} is not valid.`);
    }
    if (monthSet.has(assignment.monthNumber)) {
      errors.push("Each month can only be assigned to one quarter.");
    }
    monthSet.add(assignment.monthNumber);
    quarterCounts.set(
      assignment.quarter,
      (quarterCounts.get(assignment.quarter) ?? 0) + 1,
    );
  }

  if (monthSet.size !== 12) {
    errors.push("All 12 months must be assigned to a quarter.");
  }

  for (const [quarter, count] of quarterCounts) {
    if (count === 0) {
      errors.push(`Q${quarter} needs at least one month.`);
    }
  }

  return errors;
}

export function calculatePercentToTarget(currentValue: number | null, target: number) {
  if (currentValue === null || target <= 0) return null;
  return (currentValue / target) * 100;
}

export function suggestRagStatus(
  currentValue: number | null,
  target: number,
): RagStatus {
  const percent = calculatePercentToTarget(currentValue, target);
  if (percent === null) return "na";
  if (percent >= 90) return "green";
  if (percent >= 60) return "amber";
  return "red";
}

export function calculateVariance(currentValue: number | null, target: number) {
  if (currentValue === null) return null;
  return currentValue - target;
}

export function calculateTrend(
  currentValue: number | null,
  previousValue: number | null,
): TrendDirection {
  if (currentValue === null || previousValue === null) return "not_available";
  if (currentValue > previousValue) return "improving";
  if (currentValue < previousValue) return "declining";
  return "stable";
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}

export function parseRequiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number,
) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} is required.`);
  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return value;
}

export function parseOptionalText(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number,
) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return value;
}

export function parseRequiredNumber(
  formData: FormData,
  key: string,
  label: string,
) {
  const rawValue = String(formData.get(key) ?? "").trim().replace(/,/g, "");
  if (!rawValue) throw new Error(`${label} is required.`);
  if (!decimalNumberRegex.test(rawValue)) {
    throw new Error(`${label} must be a positive number with up to 2 decimals.`);
  }
  return Number(rawValue);
}

export function parseOptionalNumber(
  formData: FormData,
  key: string,
  label: string,
) {
  const rawValue = String(formData.get(key) ?? "").trim().replace(/,/g, "");
  if (!rawValue) return null;
  if (!decimalNumberRegex.test(rawValue)) {
    throw new Error(`${label} must be a positive number with up to 2 decimals.`);
  }
  return Number(rawValue);
}

export function parseRagStatus(value: FormDataEntryValue | null): RagStatus {
  const status = String(value ?? "na");
  if (ragStatuses.includes(status as RagStatus)) return status as RagStatus;
  return "na";
}

export function parseMilestoneStatus(
  value: FormDataEntryValue | null,
): MilestoneStatus {
  const status = String(value ?? "not_started");
  if (milestoneStatuses.includes(status as MilestoneStatus)) {
    return status as MilestoneStatus;
  }
  return "not_started";
}
