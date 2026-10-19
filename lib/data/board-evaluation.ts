import "server-only";

import { aggregateEvaluationScores, canShowBoardEvaluationResults, parseEvaluationScores } from "@/lib/board-evaluation/domain";
import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";

export async function getBoardEvaluationData(selectedCycleId?: string) {
  const context = await getGovernanceGrowthContext("board_evaluation");
  if (!context.hasAccess) {
    return { hasAccess: false as const, canManage: false, cycle: null, responseCount: 0,
      hasSubmitted: false, ownScores: null, averages: [], actions: [], cycles: [], hasOpenCycle: false };
  }

  const { data: cycleRows, error: cycleError } = await context.admin
    .from("board_evaluation_cycles")
    .select("id, year, status, closes_on")
    .eq("organization_id", context.session.organization.id)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });
  if (cycleError) throw cycleError;
  const cycles = (cycleRows ?? []).map((row) => ({
    id: row.id,
    year: row.year,
    status: row.status as "open" | "closed",
  }));
  const hasOpenCycle = cycles.some((item) => item.status === "open");
  const cycle = cycleRows?.find((item) => item.id === selectedCycleId) ?? cycleRows?.[0];
  if (!cycle) {
    return { hasAccess: true as const, canManage: context.canManage, cycle: null,
      responseCount: 0, hasSubmitted: false, ownScores: null, averages: [], actions: [],
      cycles, hasOpenCycle };
  }

  const [responsesResult, actionsResult] = await Promise.all([
    context.admin.from("board_evaluation_responses")
      .select("respondent_id, scores")
      .eq("cycle_id", cycle.id)
      .eq("organization_id", context.session.organization.id),
    context.admin.from("board_evaluation_actions")
      .select("id, title, owner_name, due_on, status")
      .eq("cycle_id", cycle.id)
      .eq("organization_id", context.session.organization.id)
      .order("created_at", { ascending: true }),
  ]);
  if (responsesResult.error) throw responsesResult.error;
  if (actionsResult.error) throw actionsResult.error;

  const responses = responsesResult.data ?? [];
  const ownResponse = responses.find((item) => item.respondent_id === context.session.member.id);
  return {
    hasAccess: true as const,
    canManage: context.canManage,
    cycles,
    hasOpenCycle,
    cycle: {
      id: cycle.id,
      year: cycle.year,
      status: cycle.status as "open" | "closed",
      closesOn: cycle.closes_on,
    },
    responseCount: responses.length,
    hasSubmitted: Boolean(ownResponse),
    ownScores: ownResponse
      ? parseEvaluationScores(ownResponse.scores as Record<string, unknown>)
      : null,
    averages: canShowBoardEvaluationResults(cycle.status, responses.length)
      ? aggregateEvaluationScores(responses.map((item) => parseEvaluationScores(item.scores as Record<string, unknown>)))
      : [],
    actions: (actionsResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      ownerName: item.owner_name,
      dueOn: item.due_on,
      status: item.status as "planned" | "in_progress" | "completed",
    })),
  };
}
