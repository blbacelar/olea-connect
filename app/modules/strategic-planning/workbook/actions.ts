"use server";

import * as z from "zod";

import { requireGovernanceGrowthManager } from "@/lib/governance-growth/access";
import { parseWorkbookActions, type WorkbookAction } from "@/lib/strategic-planning/action-tracker";
import { parseWorkbookValues, type WorkbookValues } from "@/lib/strategic-planning/workbook";

export type WorkbookSaveResult = {
  status: "success" | "conflict";
  revision: number;
  message: string;
};

export async function saveStrategicWorkbook(input: {
  revision: number;
  values: WorkbookValues;
  actions: WorkbookAction[];
}): Promise<WorkbookSaveResult> {
  const context = await requireGovernanceGrowthManager("strategic_planning");
  const revision = z.number().int().min(0).parse(input.revision);
  const values = parseWorkbookValues(input.values);
  const actions = parseWorkbookActions(input.actions);
  const horizon = Number(values["set.horizon"] || 3);
  if (actions.some((action) => action.year > horizon)) {
    throw new Error("Action years must fit the selected plan horizon.");
  }
  const organizationId = context.session.organization.id;
  const fields = {
    state: { values, actions },
    updated_by: context.session.member.id,
    updated_at: new Date().toISOString(),
  };
  if (revision === 0) {
    const { data, error } = await context.admin.from("strategic_workbooks")
      .insert({ ...fields, organization_id: organizationId, revision: 1 })
      .select("revision").maybeSingle();
    if (error?.code === "23505") return {
      status: "conflict", revision,
      message: "Another editor created this workbook. Reload to see their changes.",
    };
    if (error) throw error;
    return { status: "success", revision: data!.revision, message: "Workbook saved." };
  }
  const { data, error } = await context.admin.from("strategic_workbooks")
    .update({ ...fields, revision: revision + 1 })
    .eq("organization_id", organizationId).eq("revision", revision)
    .select("revision").maybeSingle();
  if (error) throw error;
  if (!data) return {
    status: "conflict", revision,
    message: "Another editor saved a newer version. Reload before saving again.",
  };
  return { status: "success", revision: data.revision, message: "Workbook saved." };
}
