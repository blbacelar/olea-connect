import type { WorkbookAction } from "./action-tracker";
import { workbookCalendarRows, type WorkbookValues } from "./workbook";

export type PlanBlock =
  | { kind: "text"; label?: string; value: string }
  | { kind: "table"; label?: string; headers: string[]; rows: string[][] };
export type PlanSection = { title: string; source: string; blocks: PlanBlock[]; ready: boolean };

const text = (value: string, label?: string): PlanBlock[] => value.trim()
  ? [{ kind: "text", value: value.trim(), label }] : [];
const table = (headers: string[], rows: string[][], label?: string): PlanBlock[] => rows.length
  ? [{ kind: "table", headers, rows, label }] : [];

export function buildStrategicPlan(values: WorkbookValues, actions: WorkbookAction[]) {
  const get = (key: string) => values[key]?.trim() ?? "";
  const horizon = Number(get("set.horizon") || 3);
  const rows = (id: string, count: number, columns: number) => Array.from({ length: count }, (_, row) =>
    Array.from({ length: columns }, (_, column) => get(`${id}:${row}:${column}`)));
  const nonempty = (items: string[][], columns: number[]) => items.filter((row) =>
    columns.some((column) => row[column]));
  const engagement = nonempty(rows("m2.eng", Number(get("m2.eng:rows") || 4), 3), [0, 1, 2]);
  const issues = nonempty(rows("m2.issues", Number(get("m2.issues:rows") || 5), 2), [0, 1]);
  const valuesRows = nonempty(rows("m3.values", Number(get("m3.values:rows") || 5), 2), [0]);
  const goals = nonempty(rows("m4.goals", Number(get("m4.goals:rows") || 4), 4), [0]);
  const priorities = nonempty(rows("m5.pri", Number(get("m5.pri:rows") || 10), 4 + horizon), [1]);
  const calendar = workbookCalendarRows(horizon).map((row, index) => [
    get(`m9.cal:${index}:0`) || row[0], get(`m9.cal:${index}:1`) || row[1],
    get(`m9.cal:${index}:2`) || row[2], get(`m9.cal:${index}:3`),
  ]);
  const sections: PlanSection[] = [];
  const add = (title: string, source: string, blocks: PlanBlock[]) => sections.push({
    title, source, blocks, ready: blocks.length > 0,
  });
  add("Message from the Board Chair and ED/CEO", "Module 8A", text(get("m8.message")));
  if (get("m8.land")) add("Land acknowledgement", "Module 8A", text(get("m8.land")));
  add("About us", "Module 8A or Start here", text(get("m8.about") || get("org.serve")));
  add("How we developed this plan", "Modules 8A and 2C", [
    ...text(get("m8.how")),
    ...table(["Group", "Method", "How many"], engagement, "Who we heard from"),
  ]);
  add("Where we are today", "Module 2", [
    ...text(get("m2.heard"), "What we heard"),
    ...table(["Issue", "Why it matters"], issues, "The issues this plan addresses"),
  ]);
  add("Mission, vision and values", "Module 3", [
    ...text(get("m3.mission"), "Mission"), ...text(get("m3.vision"), "Vision"),
    ...table(["Value", "What it looks like in practice"], valuesRows, "Values"),
  ]);
  const goalBlocks: PlanBlock[] = [];
  goals.forEach((goal, index) => {
    goalBlocks.push(...text(goal[0], `Goal ${index + 1}`));
    goalBlocks.push(...text(goal[1], "What it means"));
    goalBlocks.push(...text(goal[2], "Why it matters now"));
    goalBlocks.push(...text(goal[3], "Outcome by the end of the plan"));
    const under = priorities.filter((priority) => priority[0].toLowerCase() === goal[0].toLowerCase());
    goalBlocks.push(...table(["Key priority", "Measure", "Baseline",
      ...Array.from({ length: horizon }, (_, year) => `Year ${year + 1} target`)],
    under.map((priority) => priority.slice(1)), `Priorities for Goal ${index + 1}`));
  });
  add("Strategic goals and key priorities", "Modules 4 and 5", goalBlocks);
  const actionBlocks: PlanBlock[] = [];
  for (let year = 1; year <= horizon; year++) {
    const selected = actions.filter((action) => action.year === year);
    actionBlocks.push(...table(["Key priority", "Action", "Owner", "Due", "Budget", "Funding source", "Funding status", "Budget line"],
      selected.map((action) => [action.keyPriority, action.action, action.owner,
        action.dueQuarter ? `Year ${action.dueQuarter[1]}, Q${action.dueQuarter[3]}` : "",
        action.budgetCents ? cad(action.budgetCents) : "", action.fundingSource,
        action.fundingStatus, action.budgetLine ?? ""]), `Year ${year}`));
  }
  add("Actions by year", "Module 6", actionBlocks);
  const budgetRows = Array.from({ length: horizon }, (_, year) => {
    const selected = actions.filter((action) => action.year === year + 1);
    return [String(year + 1), cad(selected.reduce((sum, action) => sum + action.budgetCents, 0)),
      cad(selected.filter((action) => action.fundingStatus === "Secured")
        .reduce((sum, action) => sum + action.budgetCents, 0)),
      cad(selected.filter((action) => action.fundingStatus === "Pending")
        .reduce((sum, action) => sum + action.budgetCents, 0)),
      cad(selected.filter((action) => action.fundingStatus === "To be raised")
        .reduce((sum, action) => sum + action.budgetCents, 0))];
  });
  add("Plan budget", "Module 6", actions.some((action) => action.budgetCents) ?
    table(["Year", "Budget", "Secured", "Pending", "To be raised"], budgetRows) : []);
  add("How we will track progress", "Module 7", [
    ...text(get("m7.coord"), "Tracker coordinator"),
    ...text(get("m7.deadline"), "Owners update the tracker"),
    ...text(get("m7.board"), "The board reviews progress"),
    ...(get("m7.coord") || get("m7.deadline") || get("m7.board") ?
      table(["Status", "What it means"], [
        ["Green", get("m7.green") || "Progressing as planned."],
        ["Yellow", get("m7.yellow") || "Some delay or risk, with a plan to recover."],
        ["Red", get("m7.red") || "Needs a decision, resources or help."],
      ]) : []),
  ]);
  add("How we will review the plan", "Module 9", calendar.some((row) => row[3]) ?
    table(["Review", "What happens", "Who", "Date"], calendar) : []);
  add("Thank you", "Module 8A", text(get("m8.thanks")));
  return { organization: get("org.name") || "Our organization", period: get("start.period"),
    horizon, approvedOn: get("m8.date"), mission: get("m3.mission"), vision: get("m3.vision"),
    goals: goals.map((goal) => ({ title: goal[0], outcome: goal[3],
      priorities: priorities.filter((priority) => priority[0].toLowerCase() === goal[0].toLowerCase())
        .map((priority) => priority[1]) })),
    values: valuesRows.map((row) => row[0]), sections,
    ready: sections.filter((section) => section.ready).length };
}

function cad(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}
