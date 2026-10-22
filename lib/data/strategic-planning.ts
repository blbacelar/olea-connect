import "server-only";

import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";

export type StrategicPlan = {
  organizationId: string;
  title: string;
  mission: string;
  vision: string;
  startsOn: string;
  endsOn: string;
  status: "draft" | "active" | "completed";
  approvedOn: string | null;
};

export type StrategicGoal = {
  id: string;
  title: string;
  intendedOutcome: string;
  measure: string;
  ownerName: string;
  dueOn: string | null;
  status: "planned" | "on_track" | "at_risk" | "completed";
  progressNote: string;
};

export async function getStrategicPlanningData() {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess) {
    return { hasAccess: false as const, canManage: false, plan: null, goals: [] };
  }

  const { data: plan, error: planError } = await context.admin
    .from("strategic_plans")
    .select("organization_id, title, mission, vision, starts_on, ends_on, status, approved_on")
    .eq("organization_id", context.session.organization.id)
    .maybeSingle();
  if (planError) throw planError;

  const { data: goals, error: goalsError } = plan
    ? await context.admin.from("strategic_goals")
        .select("id, title, intended_outcome, measure, owner_name, due_on, status, progress_note")
        .eq("organization_id", context.session.organization.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (goalsError) throw goalsError;

  return {
    hasAccess: true as const,
    canManage: context.canManage,
    plan: plan ? {
      organizationId: plan.organization_id,
      title: plan.title,
      mission: plan.mission,
      vision: plan.vision,
      startsOn: plan.starts_on,
      endsOn: plan.ends_on,
      status: plan.status as StrategicPlan["status"],
      approvedOn: plan.approved_on,
    } : null,
    goals: (goals ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      intendedOutcome: goal.intended_outcome,
      measure: goal.measure,
      ownerName: goal.owner_name,
      dueOn: goal.due_on,
      status: goal.status as StrategicGoal["status"],
      progressNote: goal.progress_note,
    })),
  };
}
