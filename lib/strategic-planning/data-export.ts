import type { BrandProfile } from "@/lib/types";

import { actionSpentCents, effectiveActionStatus, type WorkbookAction } from "./action-tracker";
import type { WorkbookValues } from "./workbook";

function csvCell(value: unknown) {
  const content = String(value ?? "");
  const safe = /^\s*[-=+@]/.test(content) ? `'${content}` : content;
  return `"${safe.replaceAll('"', '""')}"`;
}

const amount = (cents: number) => (cents / 100).toFixed(2);
const quarterLabel = (key: string) => key ? `Year ${key[1]}, Q${key[3]}` : "";

export function buildStrategicDataCsv(input: {
  kind: "tracker" | "budget";
  brand: BrandProfile;
  actions: WorkbookAction[];
  quarter: string;
}) {
  const { kind, brand, actions, quarter } = input;
  const rows: string[][] = [["Organization", brand.organizationName],
    ["Report", kind === "tracker" ? "Action tracker" : "Plan budget"], [""]];
  if (kind === "tracker") {
    rows.push(["Year", "Goal", "Key priority", "Action", "Owner", "Due", `Status ${quarterLabel(quarter)}`,
      "Update", "Budget CAD", `Spent ${quarterLabel(quarter)} CAD`, "Spent to date CAD"]);
    for (const action of actions) {
      const update = action.updates.find((item) => item.quarter === quarter);
      rows.push([`Year ${action.year}`, action.goal, action.keyPriority, action.action, action.owner,
        quarterLabel(action.dueQuarter), effectiveActionStatus(action, quarter), update?.note ?? "",
        amount(action.budgetCents), amount(update?.spentCents ?? 0), amount(actionSpentCents(action))]);
    }
  } else {
    rows.push(["Year", "Due", "Goal", "Key priority", "Action", "Owner", "Budget line", "Budget CAD", "Funding source",
      "Funding status", "Spent to date CAD", "Remaining CAD", "Latest status"]);
    for (const action of actions) {
      const spent = actionSpentCents(action);
      const latestUpdate = [...action.updates].sort((a, b) => b.quarter.localeCompare(a.quarter))[0];
      rows.push([`Year ${action.year}`, quarterLabel(action.dueQuarter), action.goal, action.keyPriority,
        action.action, action.owner, action.budgetLine ?? "", amount(action.budgetCents), action.fundingSource, action.fundingStatus,
        amount(spent), amount(action.budgetCents - spent), latestUpdate?.status ?? ""]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function buildStrategicWorkbookJson(input: {
  brand: BrandProfile;
  revision: number;
  values: WorkbookValues;
  actions: WorkbookAction[];
  exportedAt?: Date;
}) {
  return JSON.stringify({ workbook: "strategic-planning", version: 2,
    exported: (input.exportedAt ?? new Date()).toISOString(),
    organization: { name: input.brand.organizationName, primaryColor: input.brand.primaryColor,
      secondaryColor: input.brand.secondaryColor },
    revision: input.revision, data: { values: input.values, actions: input.actions } }, null, 2);
}
