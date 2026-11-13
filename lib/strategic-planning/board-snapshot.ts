import * as z from "zod";

import { actionCounts, actionInQuarterScope, actionRollup, actionSpentCents,
  effectiveActionStatus, quarterKeys, type WorkbookAction } from "./action-tracker";
import type { WorkbookValues } from "./workbook";

const quarterSchema = z.string().regex(/^y[1-5]q[1-4]$/);
export const boardNarrativeSchema = z.object({
  quarter: quarterSchema,
  executiveSummary: z.string().trim().max(3000),
  decisions: z.string().trim().max(3000),
}).strict();
export type BoardNarrative = z.infer<typeof boardNarrativeSchema>;

export function buildBoardSnapshot(values: WorkbookValues, actions: WorkbookAction[], input: BoardNarrative) {
  const narrative = boardNarrativeSchema.parse(input);
  const horizon = Number(values["set.horizon"] || 3);
  const quarters = quarterKeys(horizon);
  const index = quarters.indexOf(narrative.quarter);
  if (index < 0) throw new Error("Choose a quarter within the plan horizon.");
  const scoped = actions.filter((action) => actionInQuarterScope(action, narrative.quarter));
  const counts = actionCounts(scoped, narrative.quarter);
  const goals = [...new Set(scoped.map((action) => action.goal).filter(Boolean))].map((name) => {
    const goalActions = scoped.filter((action) => action.goal === name);
    return { name, counts: actionCounts(goalActions, narrative.quarter),
      status: actionRollup(goalActions, narrative.quarter), actionCount: goalActions.length };
  });
  const attention = scoped.filter((action) => ["red", "yellow"].includes(effectiveActionStatus(action, narrative.quarter)))
    .map((action) => ({ goal: action.goal, action: action.action, owner: action.owner,
      status: effectiveActionStatus(action, narrative.quarter),
      note: action.updates.find((update) => update.quarter === narrative.quarter)?.note ?? "" }));
  const wins = actions.filter((action) => action.updates.some((update) => update.quarter === narrative.quarter &&
    update.status === "done")).map((action) => ({ action: action.action, owner: action.owner }));
  const nextQuarter = quarters[index + 1] ?? null;
  const upcoming = nextQuarter ? actions.filter((action) => action.dueQuarter === nextQuarter &&
    effectiveActionStatus(action, narrative.quarter) !== "done")
    .map((action) => ({ action: action.action, owner: action.owner })) : [];
  const year = Number(narrative.quarter[1]);
  const yearActions = actions.filter((action) => action.year === year);
  const budgetCents = yearActions.reduce((sum, action) => sum + action.budgetCents, 0);
  const spentCents = yearActions.reduce((sum, action) => sum + actionSpentCents(action), 0);
  const securedCents = yearActions.filter((action) => action.fundingStatus === "Secured")
    .reduce((sum, action) => sum + action.budgetCents, 0);
  const toRaiseCents = yearActions.filter((action) => action.fundingStatus === "To be raised")
    .reduce((sum, action) => sum + action.budgetCents, 0);
  return { quarter: narrative.quarter, year, title: values["org.name"] || "Our organization",
    period: values["start.period"] || "", preparedBy: values["m7.coord"] || "",
    executiveSummary: narrative.executiveSummary, decisions: narrative.decisions,
    status: actionRollup(scoped, narrative.quarter), actionCount: scoped.length, counts,
    onTrackPercent: scoped.length ? Math.round((counts.green + counts.done) / scoped.length * 100) : 0,
    goals, attention, wins, upcoming, nextQuarter,
    budget: { budgetCents, spentCents, securedCents, toRaiseCents },
  };
}
