import * as z from "zod";

const quarter = z.string().regex(/^y[1-5]q[1-4]$/);
const cents = z.number().int().min(0).max(100_000_000_000);
const status = z.enum(["green", "yellow", "red", "done", ""]);
const updateSchema = z.object({
  quarter,
  status,
  note: z.string().trim().max(1000),
  spentCents: cents,
}).strict();

const actionSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int().min(1).max(5),
  goal: z.string().trim().max(300),
  keyPriority: z.string().trim().max(300),
  action: z.string().trim().min(3).max(500),
  owner: z.string().trim().max(160),
  dueQuarter: z.union([quarter, z.literal("")]),
  budgetCents: cents,
  fundingSource: z.string().trim().max(160),
  fundingStatus: z.enum(["Secured", "Pending", "To be raised", ""]),
  budgetLine: z.string().trim().max(160).optional(),
  carriedFromYear: z.number().int().min(1).max(4).nullable(),
  originId: z.string().uuid().nullable(),
  updates: z.array(updateSchema).max(20),
}).strict();

export type WorkbookAction = z.infer<typeof actionSchema>;
export type WorkbookActionUpdate = z.infer<typeof updateSchema>;

export function parseWorkbookActions(input: unknown): WorkbookAction[] {
  const actions = z.array(actionSchema).max(500).parse(input);
  const ids = new Set<string>();
  for (const action of actions) {
    if (ids.has(action.id)) throw new Error("An action appears more than once.");
    ids.add(action.id);
    const quarters = new Set<string>();
    for (const update of action.updates) {
      if (quarters.has(update.quarter)) throw new Error("A quarter update appears more than once.");
      quarters.add(update.quarter);
    }
  }
  return actions;
}

export function quarterKeys(horizon: number) {
  if (horizon !== 3 && horizon !== 5) throw new Error("Choose a 3-year or 5-year plan.");
  return Array.from({ length: horizon * 4 }, (_, index) =>
    `y${Math.floor(index / 4) + 1}q${index % 4 + 1}`);
}

export function effectiveActionStatus(action: WorkbookAction, selectedQuarter: string) {
  const quarters = quarterKeys(5);
  const index = quarters.indexOf(selectedQuarter);
  if (index < 0) return "";
  const own = action.updates.find((update) => update.quarter === selectedQuarter)?.status;
  if (own) return own;
  return action.updates.some((update) =>
    update.status === "done" && quarters.indexOf(update.quarter) < index) ? "done" : "";
}

export function actionInQuarterScope(action: WorkbookAction, selectedQuarter: string) {
  const year = Number(selectedQuarter.slice(1, 2));
  return action.year === year || (action.year < year && effectiveActionStatus(action, selectedQuarter) !== "done");
}

export function actionCounts(actions: WorkbookAction[], selectedQuarter: string) {
  const counts = { green: 0, yellow: 0, red: 0, done: 0, notUpdated: 0 };
  for (const action of actions) {
    const status = effectiveActionStatus(action, selectedQuarter);
    if (status) counts[status] += 1;
    else counts.notUpdated += 1;
  }
  return counts;
}

export function actionRollup(actions: WorkbookAction[], selectedQuarter: string) {
  const counts = actionCounts(actions, selectedQuarter);
  if (counts.red) return "red" as const;
  if (counts.yellow) return "yellow" as const;
  if (counts.green) return "green" as const;
  if (counts.done) return "done" as const;
  return "" as const;
}

export function actionSpentCents(action: WorkbookAction) {
  return action.updates.reduce((sum, update) => sum + update.spentCents, 0);
}

export function rolloverUnfinishedActions(actions: WorkbookAction[], fromYear: number) {
  if (!Number.isInteger(fromYear) || fromYear < 1 || fromYear >= 5) {
    throw new Error("Choose a plan year before the final year.");
  }
  const finalQuarter = `y${fromYear}q4`;
  const next = [...actions];
  for (const action of actions) {
    if (action.year !== fromYear || effectiveActionStatus(action, finalQuarter) === "done") continue;
    if (actions.some((candidate) => candidate.originId === action.id && candidate.year === fromYear + 1)) continue;
    next.push({ ...action, id: crypto.randomUUID(), year: fromYear + 1,
      carriedFromYear: fromYear, originId: action.id, dueQuarter: "", updates: [] });
  }
  return next;
}
