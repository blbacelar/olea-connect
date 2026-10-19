"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canCloseBoardEvaluation, canManageBoardEvaluationActions, evaluationQuestions, minimumEvaluationResponses, parseEvaluationScores } from "@/lib/board-evaluation/domain";
import { getGovernanceGrowthContext, requireGovernanceGrowthManager } from "@/lib/governance-growth/access";

const path = "/modules/board-evaluation";
const date = z.iso.date();
const value = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export type EvaluationActionState = { status: "idle" | "success" | "error"; message: string };

function fail(error: unknown): EvaluationActionState {
  return { status: "error", message: error instanceof Error ? error.message : "The change could not be saved." };
}

export async function openBoardEvaluation(
  _state: EvaluationActionState,
  form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const year = z.coerce.number().int().min(2000).max(2100).parse(value(form, "year"));
    const closesOn = z.union([date, z.literal("")]).parse(value(form, "closesOn"));
    if (closesOn && closesOn < new Date().toISOString().slice(0, 10)) {
      throw new Error("Choose a closing date today or later.");
    }
    const { data: openCycle, error: lookupError } = await context.admin
      .from("board_evaluation_cycles")
      .select("id")
      .eq("organization_id", context.session.organization.id)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (openCycle) throw new Error("Close the current evaluation before opening a new one.");

    const { error } = await context.admin.from("board_evaluation_cycles").insert({
      organization_id: context.session.organization.id,
      year,
      closes_on: closesOn || null,
      created_by: context.session.member.id,
    });
    if (error) throw error;
    revalidatePath(path);
    return { status: "success", message: "Board evaluation opened." };
  } catch (error) { return fail(error); }
}

export async function closeBoardEvaluation(
  _state: EvaluationActionState,
  form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = z.uuid().parse(value(form, "cycleId"));
    const { count, error: countError } = await context.admin
      .from("board_evaluation_responses")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .eq("organization_id", context.session.organization.id);
    if (countError) throw countError;
    if (!canCloseBoardEvaluation(count ?? 0)) {
      throw new Error(`At least ${minimumEvaluationResponses} board members must respond before you can close the evaluation.`);
    }
    const { data, error } = await context.admin.from("board_evaluation_cycles")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", cycleId)
      .eq("organization_id", context.session.organization.id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The open evaluation was not found in your organization.");
    revalidatePath(path);
    return { status: "success", message: "Board evaluation closed. Results remain available." };
  } catch (error) { return fail(error); }
}

export async function extendBoardEvaluationDeadline(
  _state: EvaluationActionState,
  form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const cycleId = z.uuid().parse(value(form, "cycleId"));
    const closesOn = date.parse(value(form, "closesOn"));
    if (closesOn < new Date().toISOString().slice(0, 10)) {
      throw new Error("Choose a closing date today or later.");
    }
    const { data, error } = await context.admin.from("board_evaluation_cycles")
      .update({ closes_on: closesOn })
      .eq("id", cycleId)
      .eq("organization_id", context.session.organization.id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The open evaluation was not found in your organization.");
    revalidatePath(path);
    return { status: "success", message: "Response deadline updated." };
  } catch (error) { return fail(error); }
}

export async function submitBoardEvaluation(
  _state: EvaluationActionState,
  form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await getGovernanceGrowthContext("board_evaluation");
    if (!context.hasAccess) throw new Error("An active Roots or Canopy membership is required.");
    const cycleId = z.uuid().parse(value(form, "cycleId"));
    const { data: cycle, error: cycleError } = await context.admin
      .from("board_evaluation_cycles")
      .select("id, status, closes_on")
      .eq("id", cycleId)
      .eq("organization_id", context.session.organization.id)
      .maybeSingle();
    if (cycleError) throw cycleError;
    if (!cycle || cycle.status !== "open" ||
      (cycle.closes_on && cycle.closes_on < new Date().toISOString().slice(0, 10))) {
      throw new Error("This board evaluation is closed.");
    }
    const scores = parseEvaluationScores(Object.fromEntries(
      evaluationQuestions.map((question) => [question.id, value(form, question.id)]),
    ));
    const { error } = await context.admin.from("board_evaluation_responses")
      .upsert({
        cycle_id: cycle.id,
        organization_id: context.session.organization.id,
        respondent_id: context.session.member.id,
        scores,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "cycle_id,respondent_id" });
    if (error) throw error;
    revalidatePath(path);
    return { status: "success", message: "Your ratings were saved. Individual responses stay private." };
  } catch (error) { return fail(error); }
}

export async function saveBoardEvaluationAction(
  _state: EvaluationActionState,
  form: FormData,
): Promise<EvaluationActionState> {
  try {
    const context = await requireGovernanceGrowthManager("board_evaluation");
    const parsed = z.object({
      cycleId: z.uuid(),
      actionId: z.union([z.uuid(), z.literal("")]),
      title: z.string().trim().min(3).max(200),
      ownerName: z.string().trim().max(160),
      dueOn: z.union([date, z.literal("")]),
      status: z.enum(["planned", "in_progress", "completed"]),
    }).safeParse({
      cycleId: value(form, "cycleId"),
      actionId: value(form, "actionId"),
      title: value(form, "title"),
      ownerName: value(form, "ownerName"),
      dueOn: value(form, "dueOn"),
      status: value(form, "status"),
    });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the action fields.");
    const { cycleId, actionId, title, ownerName, dueOn, status } = parsed.data;
    const { data: cycle, error: cycleError } = await context.admin.from("board_evaluation_cycles")
      .select("id, status")
      .eq("id", cycleId)
      .eq("organization_id", context.session.organization.id)
      .maybeSingle();
    if (cycleError) throw cycleError;
    if (!cycle) throw new Error("The evaluation does not belong to your organization.");
    if (!canManageBoardEvaluationActions(cycle.status)) {
      throw new Error("Close the evaluation before recording improvement actions.");
    }
    const fields = {
      title, owner_name: ownerName, due_on: dueOn || null, status,
      updated_at: new Date().toISOString(),
    };
    if (actionId) {
      const { data, error } = await context.admin.from("board_evaluation_actions")
        .update(fields)
        .eq("id", actionId)
        .eq("cycle_id", cycleId)
        .eq("organization_id", context.session.organization.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This action does not belong to your evaluation.");
    } else {
      const { error } = await context.admin.from("board_evaluation_actions")
        .insert({ ...fields, cycle_id: cycleId, organization_id: context.session.organization.id });
      if (error) throw error;
    }
    revalidatePath(path);
    return { status: "success", message: actionId ? "Action updated." : "Improvement action added." };
  } catch (error) { return fail(error); }
}
