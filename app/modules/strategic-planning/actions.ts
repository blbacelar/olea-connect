"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireGovernanceGrowthManager } from "@/lib/governance-growth/access";

const path = "/modules/strategic-planning";
const dateSchema = z.iso.date();
const optionalDate = z.union([dateSchema, z.literal("")]);

const planSchema = z.object({
  title: z.string().trim().min(3).max(160),
  mission: z.string().trim().max(2000),
  vision: z.string().trim().max(2000),
  startsOn: dateSchema,
  endsOn: dateSchema,
  status: z.enum(["draft", "active", "completed"]),
  approvedOn: optionalDate,
}).refine((value) => value.endsOn > value.startsOn, {
  message: "The end date must follow the start date.",
}).refine((value) => {
  const fiveYears = new Date(`${value.startsOn}T00:00:00Z`);
  fiveYears.setUTCFullYear(fiveYears.getUTCFullYear() + 5);
  return new Date(`${value.endsOn}T00:00:00Z`) <= fiveYears;
}, { message: "Choose a planning period of no more than five years." }).refine(
  (value) => value.status === "draft" || Boolean(value.approvedOn),
  { message: "Record the board approval date before activating the plan." },
).refine(
  (value) => value.status === "draft" || !value.approvedOn ||
    value.approvedOn <= new Date().toISOString().slice(0, 10),
  { message: "The board approval date cannot be in the future." },
);

const goalSchema = z.object({
  goalId: z.union([z.uuid(), z.literal("")]),
  title: z.string().trim().min(3).max(160),
  intendedOutcome: z.string().trim().min(3).max(1000),
  measure: z.string().trim().max(240),
  ownerName: z.string().trim().max(160),
  dueOn: optionalDate,
  status: z.enum(["planned", "on_track", "at_risk", "completed"]),
  progressNote: z.string().trim().max(2000),
});

export type PlanningActionState = { status: "idle" | "success" | "error"; message: string };
const value = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

function failure(error: unknown): PlanningActionState {
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Changes could not be saved.",
  };
}

export async function saveStrategicPlan(
  _state: PlanningActionState,
  form: FormData,
): Promise<PlanningActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const parsed = planSchema.safeParse({
      title: value(form, "title"),
      mission: value(form, "mission"),
      vision: value(form, "vision"),
      startsOn: value(form, "startsOn"),
      endsOn: value(form, "endsOn"),
      status: value(form, "status"),
      approvedOn: value(form, "approvedOn"),
    });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the plan fields.");
    const plan = parsed.data;
    const { error } = await context.admin.from("strategic_plans").upsert({
      organization_id: context.session.organization.id,
      title: plan.title,
      mission: plan.mission,
      vision: plan.vision,
      starts_on: plan.startsOn,
      ends_on: plan.endsOn,
      status: plan.status,
      approved_on: plan.approvedOn || null,
      updated_by: context.session.member.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    if (error) throw error;
    revalidatePath(path);
    return { status: "success", message: "Strategic plan saved." };
  } catch (error) {
    return failure(error);
  }
}

export async function saveStrategicGoal(
  _state: PlanningActionState,
  form: FormData,
): Promise<PlanningActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const parsed = goalSchema.safeParse({
      goalId: value(form, "goalId"),
      title: value(form, "title"),
      intendedOutcome: value(form, "intendedOutcome"),
      measure: value(form, "measure"),
      ownerName: value(form, "ownerName"),
      dueOn: value(form, "dueOn"),
      status: value(form, "status"),
      progressNote: value(form, "progressNote"),
    });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the goal fields.");
    const { data: plan, error: planError } = await context.admin.from("strategic_plans")
      .select("starts_on, ends_on")
      .eq("organization_id", context.session.organization.id)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan) throw new Error("Save a strategic plan before adding goals.");
    const goal = parsed.data;
    if (goal.dueOn && (goal.dueOn < plan.starts_on || goal.dueOn > plan.ends_on)) {
      throw new Error("The goal due date must fall within the planning period.");
    }
    const fields = {
      title: goal.title,
      intended_outcome: goal.intendedOutcome,
      measure: goal.measure,
      owner_name: goal.ownerName,
      due_on: goal.dueOn || null,
      status: goal.status,
      progress_note: goal.progressNote,
      updated_at: new Date().toISOString(),
    };
    if (goal.goalId) {
      const { data, error } = await context.admin.from("strategic_goals")
        .update(fields)
        .eq("id", goal.goalId)
        .eq("organization_id", context.session.organization.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This goal does not belong to your organization.");
    } else {
      const { error } = await context.admin.from("strategic_goals")
        .insert({ ...fields, organization_id: context.session.organization.id });
      if (error) throw error;
    }
    revalidatePath(path);
    return { status: "success", message: goal.goalId ? "Goal updated." : "Goal added." };
  } catch (error) {
    return failure(error);
  }
}
