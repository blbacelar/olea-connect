import * as z from "zod";

import content from "./workbook-content.json";
import { stakeholderQuestionBank } from "./stakeholder-survey";

export type WorkbookChoice = string | { v: string; l: string };
export type WorkbookField = {
  id: string;
  label: string;
  kind: "text" | "textarea" | "date" | "choice" | "checks";
  hint?: string;
  options?: WorkbookChoice[] | "__years__";
  half?: boolean;
  setting?: boolean;
};
export type WorkbookColumn = {
  h?: string;
  type?: "select" | "date" | "check" | "number" | "sum" | "goal";
  options?: WorkbookChoice[];
};
export type WorkbookTemplateSection = {
  title: string;
  hint?: string;
  equity?: boolean;
  sizes?: string[];
  fields?: WorkbookField[];
  checklist?: { id: string; items: string[] };
  table?: { id: string; rows?: number; add?: boolean; prefill?: string[] | string; cols: Array<WorkbookColumn | string> };
  swot?: string;
  custom?: string;
};
export type WorkbookModule = {
  id: string;
  num: string;
  short: string;
  title: string;
  purpose: string;
  who: string;
  time: Record<string, string>;
  questions?: string[];
  steps?: string[];
  scale?: Record<string, string>;
  facilitator?: string[];
  equity?: string[];
  tips?: string[];
  output?: string;
  guidance?: Array<{ h: string; html: string }>;
  template: WorkbookTemplateSection[];
};

export const workbookModules = content.modules as WorkbookModule[];
export const workbookSizes = content.sizes;
const fieldMap = new Map(workbookModules.flatMap((module) => module.template.flatMap((section) =>
  (section.fields ?? []).map((field) => [field.id, field] as const))));
fieldMap.set("m6.finlead", { id: "m6.finlead", label: "Finance lead", kind: "text" });
const checklistMap = new Map(workbookModules.flatMap((module) => module.template.flatMap((section) =>
  section.checklist ? [[section.checklist.id, section.checklist]] as const : [])));
const tableMap = new Map(workbookModules.flatMap((module) => module.template.flatMap((section) =>
  section.table ? [[section.table.id, section.table]] as const : [])));
const swotIds = new Set(workbookModules.flatMap((module) => module.template
  .map((section) => section.swot).filter((value): value is string => Boolean(value))));

export type WorkbookValues = Record<string, string>;

function optionValues(options: WorkbookChoice[] | "__years__" | undefined) {
  if (options === "__years__") return Array.from({ length: 5 }, (_, index) => `year-${index + 1}`);
  return (options ?? []).map((option) => typeof option === "string" ? option : option.v);
}

export function workbookCalendarRows(horizon: number) {
  const rows = [
    ["Monthly", "Staff check progress on action plans", "ED/CEO and staff"],
    ["Quarterly", "Owners update the action tracker; the board reviews the dashboard", "Action owners, ED/CEO and board"],
    ["Annually", "Plan review; carry forward unfinished actions; plan next year's actions and budget", "Board, ED/CEO and finance lead"],
  ];
  if (horizon === 5) rows.push(["Mid-point (Year 3)",
    "Deeper review: rescan the environment, confirm or adjust priorities", "Board, staff and key stakeholders"]);
  rows.push(["Final year", "Evaluate the plan and begin Module 1 for the next one", "Board and ED/CEO"]);
  return rows;
}

function validateDate(value: string) {
  if (value) z.iso.date().parse(value);
}

function validateWorkbookValue(key: string, value: string) {
  const field = fieldMap.get(key);
  if (field) {
    if (field.kind === "date") validateDate(value);
    if (["org.budget", "m1.budget"].includes(key) && value &&
      !/^\$?\s*(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?\s*[kKmM]?$/.test(value)) {
      throw new Error(`${field.label} must be a CAD amount, such as 500,000 or 500K.`);
    }
    if (field.kind === "choice" && value && !optionValues(field.options).includes(value)) {
      throw new Error(`Invalid selection for ${field.label}.`);
    }
    if (field.kind === "checks") {
      const selected = value ? value.split("|") : [];
      if (selected.some((item) => !optionValues(field.options).includes(item))) {
        throw new Error(`Invalid selection for ${field.label}.`);
      }
    }
    if (value.length > (field.id === "m2.heard" ? 30_000 : field.kind === "textarea" ? 3000 : 500)) {
      throw new Error(`${field.label} is too long.`);
    }
    return;
  }
  const parts = key.split(":");
  const checklist = checklistMap.get(parts[0]);
  if (checklist && parts.length === 2) {
    const index = Number(parts[1]);
    if (!Number.isInteger(index) || index < 0 || index >= checklist.items.length ||
      !["yes", "no", ""].includes(value)) {
      throw new Error("Invalid checklist answer.");
    }
    return;
  }
  if (checklist && parts.length === 3 && parts[2] === "note" &&
    Number.isInteger(Number(parts[1])) && Number(parts[1]) >= 0 &&
    Number(parts[1]) < checklist.items.length && value.length <= 500) return;
  const table = tableMap.get(parts[0]);
  if (table && parts.length === 2 && parts[1] === "rows") {
    const count = Number(value);
    if (!Number.isInteger(count) || count < (table.rows ??
      (Array.isArray(table.prefill) ? table.prefill.length : 1)) || count > 100) {
      throw new Error("Invalid workbook row count.");
    }
    return;
  }
  if (table && parts.length === 3) {
    const row = Number(parts[1]);
    const column = Number(parts[2]);
    const dynamicYears = table.cols.includes("{years}");
    const spec = table.cols[column] ?? (dynamicYears && column >= table.cols.length - 1 &&
      column < table.cols.length - 1 + 5 ? { h: `Year target` } : undefined);
    if (!Number.isInteger(row) || row < 0 || row > 99 || !Number.isInteger(column) ||
      column < 0 || !spec || value.length > 1000) {
      throw new Error("Invalid workbook table cell.");
    }
    if (typeof spec !== "string") {
      if (spec.type === "date") validateDate(value);
      if (spec.type === "number" && value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        throw new Error("Enter a nonnegative number.");
      }
      if (spec.type === "number" && table?.id === "m4.score" && value &&
        (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5)) {
        throw new Error("Score each goal from 1 to 5.");
      }
      if (spec.type === "check" && !["true", "false", ""].includes(value)) {
        throw new Error("Invalid checkbox value.");
      }
      if (spec.type === "select" && value && !optionValues(spec.options).includes(value)) {
        throw new Error("Invalid table selection.");
      }
      if (spec.type === "sum" && value) throw new Error("Calculated totals cannot be edited.");
    }
    return;
  }
  if (swotIds.has(parts[0]) && parts.length === 3 && ["s", "w", "o", "t"].includes(parts[1]) &&
    Number.isInteger(Number(parts[2])) && Number(parts[2]) >= 0 && Number(parts[2]) < 20 && value.length <= 1000) {
    return;
  }
  if (swotIds.has(parts[0]) && parts.length === 2 && ["s", "w", "o", "t"].includes(parts[1]) &&
    value.length <= 3000) return;
  const surveyCount = /^m2\.sv\.resp\.(board|staff|volunteers|clients|partners|funders|community|everyone|paper)$/.test(key);
  const surveyResult = /^m2\.sv\.res\.([a-z_0-9]{1,40})\.(n|result|themes)$/.exec(key);
  if (surveyCount || surveyResult) {
    if (surveyResult && !/^c(?:[0-9]|1[0-4])$/.test(surveyResult[1]) &&
      !stakeholderQuestionBank.some((question) => question.id === surveyResult[1])) {
      throw new Error("Invalid stakeholder question.");
    }
    if (surveyCount || surveyResult?.[2] === "n") {
      if (value && (!/^\d{1,7}$/.test(value) || Number(value) > 1_000_000)) {
        throw new Error("Survey response counts must be whole numbers between 0 and 1,000,000.");
      }
    } else if (value.length > 2000) throw new Error("A survey result is too long.");
    return;
  }
  if (/^legacy:[a-zA-Z0-9_.:-]{1,120}$/.test(key) && value.length <= 20_000) return;
  const financeReview = /^m6\.fin\.y([1-5])\.(date|inbudget|notes)$/.exec(key);
  if (financeReview) {
    if (financeReview[2] === "date") validateDate(value);
    if (financeReview[2] === "inbudget" && !["", "Yes", "Partly", "Not yet"].includes(value)) {
      throw new Error("Choose whether the annual budget includes this year's actions.");
    }
    if (value.length > (financeReview[2] === "notes" ? 3000 : 500)) throw new Error("Finance review is too long.");
    return;
  }
  throw new Error("Unknown workbook field.");
}

export function parseWorkbookValues(input: unknown): WorkbookValues {
  const values = z.record(z.string(), z.string()).parse(input);
  if (Object.keys(values).length > 1000 || JSON.stringify(values).length > 250_000) {
    throw new Error("This workbook is too large to save.");
  }
  for (const [key, value] of Object.entries(values)) validateWorkbookValue(key, value);
  const reviewYear = Number(values["m9.year"]?.replace("year-", "") ?? 0);
  if (reviewYear > Number(values["set.horizon"] || 3)) {
    throw new Error("The review year must fit the plan horizon.");
  }
  return values;
}

export function workbookDefaultValues(): WorkbookValues {
  const values: WorkbookValues = { "set.size": "mid", "set.horizon": "3", "set.equity": "on" };
  for (const module of workbookModules) {
    for (const section of module.template) {
      const prefill = section.table?.prefill;
      if (Array.isArray(prefill)) prefill.forEach((label, index) => {
        values[`${section.table!.id}:${index}:0`] = label;
      });
    }
  }
  return values;
}
