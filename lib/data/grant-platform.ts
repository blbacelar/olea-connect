import "server-only";

import { requireMemberContext } from "@/lib/data/member-context";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { getGrantPlatformApplicationActionState } from "@/lib/grants/workflow";
import { createClient } from "@/utils/supabase/server";

export interface GrantPlatformWorkspaceData {
  organizationName: string;
  summary: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  workflowState: Record<string, ReturnType<typeof getGrantPlatformApplicationActionState>>;
  rounds: Array<{
    id: string;
    name: string;
    status: string;
    opensAt: string | null;
    closesAt: string | null;
    decisionAt: string | null;
    awardAmountCents: number;
    availableAwards: number;
    budgetCents: number;
    programName: string;
    programType: string;
    description: string;
    existingApplicationId: string | null;
  }>;
  applications: Array<{
    id: string;
    roundId: string;
    roundName: string;
    status: string;
    focusArea: string;
    fundingRequest: string;
    requestedAmountCents: number;
    submittedAt: string | null;
    deadlineAt: string | null;
    collaborationNote: string | null;
    updatedAt: string;
    awardStatus: string | null;
    summary: string;
    nextMilestone: string;
  }>;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    highlights: string[];
  }>;
}

export async function getGrantPlatformData(): Promise<GrantPlatformWorkspaceData> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { canViewBudgets, canViewReports } = getGrantPlatformUiAccess(member.role);

  const [{ data: organizationRecord, error: organizationError }, { data: rounds, error: roundsError }, { data: applications, error: applicationsError }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", organization.id)
      .maybeSingle(),
    supabase
      .from("grant_rounds")
      .select(
        "id, name, status, opens_at, closes_at, decision_at, award_amount_cents, available_awards, budget_cents, public_notes, grant_programs(name, type, description)",
      )
      .order("opens_at", { ascending: true }),
    supabase
      .from("grant_applications")
      .select(
        "id, round_id, status, focus_area, funding_request, requested_amount_cents, submitted_at, collaboration_note, updated_at, grant_rounds(name, closes_at), grant_awards(status)",
      )
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (organizationError) throw organizationError;
  if (roundsError) throw roundsError;
  if (applicationsError) throw applicationsError;

  const visibleApplications = (applications ?? []).filter((application) => {
    if (canViewReports || canViewBudgets) return true;
    return application.status !== "approved" && application.status !== "declined";
  });

  const normalizedApplications = visibleApplications.map((application) => {
    const round = Array.isArray(application.grant_rounds)
      ? application.grant_rounds[0]
      : application.grant_rounds;
    const award = Array.isArray(application.grant_awards)
      ? application.grant_awards[0]
      : application.grant_awards;

    const statusSummary = {
      draft: "Draft package in progress",
      submitted: "Submitted and awaiting review",
      in_review: "Under review by the team",
      shortlisted: "Shortlisted for follow-up",
      approved: "Awarded and ready for delivery",
      declined: "Declined and needs review",
      withdrawn: "Withdrawn by the applicant",
    }[application.status as keyof typeof {
      draft: "Draft package in progress",
      submitted: "Submitted and awaiting review",
      in_review: "Under review by the team",
      shortlisted: "Shortlisted for follow-up",
      approved: "Awarded and ready for delivery",
      declined: "Declined and needs review",
      withdrawn: "Withdrawn by the applicant",
    }] ?? "Activity tracked";

    const nextMilestone = {
      draft: "Gather evidence and finalize the narrative",
      submitted: "Prepare the review package and follow-up notes",
      in_review: "Collect stakeholder feedback and decisions",
      shortlisted: "Confirm the next decision checkpoint",
      approved: "Kick off reporting and delivery milestones",
      declined: "Review learning notes and eligibility gaps",
      withdrawn: "Archive the request and note the decision",
    }[application.status as keyof typeof {
      draft: "Gather evidence and finalize the narrative",
      submitted: "Prepare the review package and follow-up notes",
      in_review: "Collect stakeholder feedback and decisions",
      shortlisted: "Confirm the next decision checkpoint",
      approved: "Kick off reporting and delivery milestones",
      declined: "Review learning notes and eligibility gaps",
      withdrawn: "Archive the request and note the decision",
    }] ?? "Track the current milestone";

    return {
      id: application.id,
      roundId: application.round_id,
      roundName: round?.name ?? "Grant application",
      status: application.status,
      focusArea: application.focus_area,
      fundingRequest: application.funding_request,
      requestedAmountCents: application.requested_amount_cents,
      submittedAt: application.submitted_at,
      deadlineAt: round?.closes_at ?? null,
      collaborationNote: application.collaboration_note ?? null,
      updatedAt: application.updated_at,
      awardStatus: award?.status ?? null,
      summary: statusSummary,
      nextMilestone,
    };
  });

  const existingApplicationByRoundId = new Map(
    normalizedApplications.map((application) => [application.roundId, application.id]),
  );

  const normalizedRounds = (rounds ?? []).map((round) => {
    const program = Array.isArray(round.grant_programs)
      ? round.grant_programs[0]
      : round.grant_programs;

    return {
      id: round.id,
      name: round.name,
      status: round.status,
      opensAt: round.opens_at,
      closesAt: round.closes_at,
      decisionAt: round.decision_at,
      awardAmountCents: round.award_amount_cents,
      availableAwards: round.available_awards,
      budgetCents: round.budget_cents,
      programName: program?.name ?? "Olea Gives",
      programType: program?.type ?? "quarterly",
      description: program?.description ?? round.public_notes ?? "",
      existingApplicationId: existingApplicationByRoundId.get(round.id) ?? null,
    };
  });

  const metrics = [
    {
      label: "Open rounds",
      value: String(normalizedRounds.filter((round) => round.status === "open").length),
      detail: "Currently accepting submissions",
    },
    {
      label: "Applications",
      value: String(normalizedApplications.length),
      detail: "Tracked across the current organization",
    },
    {
      label: "Awarded",
      value: String(normalizedApplications.filter((application) => application.awardStatus === "approved").length),
      detail: "Approved or granted funding",
    },
    {
      label: "Upcoming closes",
      value: String(normalizedRounds.filter((round) => round.closesAt).length),
      detail: "Deadline-driven opportunities",
    },
  ];

  const workflowState = Object.fromEntries(
    normalizedApplications.map((application) => [application.id, getGrantPlatformApplicationActionState(application.status)]),
  );

  const summary = canViewReports
    ? "A grant management workspace that brings your funding pipeline, application history, and reporting readiness together in one module."
    : "A grant management workspace that keeps the current grant pipeline and collaboration work visible for your role.";

  return {
    organizationName: organizationRecord?.name ?? organization.name,
    summary,
    metrics,
    workflowState,
    rounds: normalizedRounds,
    applications: normalizedApplications,
    sections: [
      {
        id: "pipeline",
        title: "Pipeline and opportunity tracking",
        description:
          "Use the module to track each funding opportunity, submission status, and next milestone in one place.",
        highlights: [
          "Round-by-round visibility for deadlines and funding size",
          "Submission status for each active application",
          "Clear handoff points for program and leadership review",
        ],
      },
      {
        id: "workflow",
        title: "Workflow and collaboration",
        description:
          "Keep the grant team aligned on ownership, evidence collection, and review readiness.",
        highlights: [
          "Shared status tracking for each request",
          "Focus areas and funding request summaries",
          "A simple path for next-step follow-through",
        ],
      },
      {
        id: "reports",
        title: "Reporting and board visibility",
        description:
          "Turn grant activity into a concise source of truth for leadership and reporting partners.",
        highlights: [
          "Board-ready funder and program summaries",
          "A record of awarded and pending applications",
          "A consistent format for status updates and review",
        ],
      },
      {
        id: "settings",
        title: "Settings and access",
        description:
          "Use organization-level settings to manage the rules and coordination needed for your grant work.",
        highlights: [
          "Organization context and workflow defaults",
          "Role-based visibility for sensitive work",
          "A secure foundation for reporting and collaboration",
        ],
      },
    ],
  };
}
