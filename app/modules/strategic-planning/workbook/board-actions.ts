"use server";

import { revalidatePath } from "next/cache";

import { requireGovernanceGrowthManager } from "@/lib/governance-growth/access";
import { parseWorkbookActions } from "@/lib/strategic-planning/action-tracker";
import { boardNarrativeSchema, buildBoardSnapshot, type BoardNarrative } from "@/lib/strategic-planning/board-snapshot";
import { parseWorkbookValues } from "@/lib/strategic-planning/workbook";

export async function shareStrategicBoardSnapshot(input: BoardNarrative) {
  const narrative = boardNarrativeSchema.parse(input);
  const context = await requireGovernanceGrowthManager("strategic_planning");
  const { data: workbook, error } = await context.admin.from("strategic_workbooks")
    .select("revision, state").eq("organization_id", context.session.organization.id).maybeSingle();
  if (error) throw error;
  if (!workbook) throw new Error("Save the workbook before sharing a board dashboard.");
  const values = parseWorkbookValues(workbook.state?.values ?? {});
  const actions = parseWorkbookActions(workbook.state?.actions ?? []);
  const summary = buildBoardSnapshot(values, actions, narrative);
  const { data, error: insertError } = await context.admin.from("strategic_workbook_snapshots")
    .insert({ organization_id: context.session.organization.id, source_revision: workbook.revision,
      title: `${summary.title} · Year ${summary.year}, Q${narrative.quarter[3]}`,
      summary, created_by: context.session.member.id })
    .select("id").single();
  if (insertError) throw insertError;
  revalidatePath("/modules/strategic-planning/board");
  return { id: data.id, message: "Board dashboard shared as a fixed snapshot." };
}
