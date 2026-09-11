import { getGrantPlatformApplicationActionState } from "@/lib/grants/workflow";
import type { OrganizationRole } from "@/lib/types";

import type { GrantPlatformWorkspaceData } from "./grant-platform";
import type {
  GrantPlatformApplicationRow,
  GrantPlatformFunderInteractionRow,
  GrantPlatformMemberRow,
  GrantPlatformOrganizationRow,
  GrantPlatformPartnerRow,
  GrantPlatformRoundRow,
  GrantPlatformSettingsRow,
  GrantPlatformVaultRow,
} from "./grant-platform-queries";

type BuildGrantPlatformDataInput = {
  access: {
    canEditOrgProfile: boolean;
    canViewBudgets: boolean;
    canViewReports: boolean;
  };
  members: GrantPlatformMemberRow[];
  organization: { name: string };
  organizationRecord: GrantPlatformOrganizationRow | null;
  organizationSettings: GrantPlatformSettingsRow | null;
  funderInteractions: GrantPlatformFunderInteractionRow[];
  partners: GrantPlatformPartnerRow[];
  profileMap: Map<string, string>;
  rawApplications: GrantPlatformApplicationRow[];
  rawRounds: GrantPlatformRoundRow[];
  vaultItems: GrantPlatformVaultRow[];
};

const statusSummaryMap: Record<string, string> = {
  approved: "Awarded and ready for delivery",
  declined: "Declined and needs review",
  draft: "Draft package in progress",
  in_review: "Under review by the team",
  shortlisted: "Shortlisted for follow-up",
  submitted: "Submitted and awaiting review",
  withdrawn: "Withdrawn by the applicant",
};

const nextMilestoneMap: Record<string, string> = {
  approved: "Kick off reporting and delivery milestones",
  declined: "Review learning notes and eligibility gaps",
  draft: "Gather evidence and finalize the narrative",
  in_review: "Collect stakeholder feedback and decisions",
  shortlisted: "Confirm the next decision checkpoint",
  submitted: "Prepare the review package and follow-up notes",
  withdrawn: "Archive the request and note the decision",
};

export function buildGrantPlatformWorkspaceData({
  access,
  members,
  organization,
  organizationRecord,
  organizationSettings,
  funderInteractions,
  partners,
  profileMap,
  rawApplications,
  rawRounds,
  vaultItems,
}: BuildGrantPlatformDataInput): GrantPlatformWorkspaceData {
  const applications = buildVisibleApplications(rawApplications, access);
  const rounds = buildRounds(rawRounds, applications);

  return {
    applications,
    metrics: buildGrantPlatformMetrics(rounds, applications),
    notes: buildGrantPlatformNotes(access.canEditOrgProfile),
    organizationName: organizationRecord?.name ?? organization.name,
    organizationSettings: buildOrganizationSettings(organizationSettings),
    partners: partners.map((partner) =>
      mapPartner(partner, interactionsForPartner(funderInteractions, partner.id)),
    ),
    rounds,
    sections: buildGrantPlatformSections(),
    summary: getGrantPlatformSummary(access.canViewReports),
    teamMembers: buildTeamMembers(members, profileMap),
    vaultItems: vaultItems.map(mapVaultItem),
    workflowState: buildWorkflowState(applications),
  };
}

function buildVisibleApplications(
  applications: GrantPlatformApplicationRow[],
  access: BuildGrantPlatformDataInput["access"],
) {
  return applications
    .filter((application) => isApplicationVisible(application.status, access))
    .map(mapApplication);
}

function isApplicationVisible(
  status: string,
  access: BuildGrantPlatformDataInput["access"],
) {
  return (
    access.canViewReports ||
    access.canViewBudgets ||
    (status !== "approved" && status !== "declined")
  );
}

function mapApplication(application: GrantPlatformApplicationRow) {
  const round = getRelation(application.grant_rounds);
  const award = getRelation(application.grant_awards);

  return {
    awardStatus: award?.status ?? null,
    collaborationNote: application.collaboration_note ?? null,
    deadlineAt: round?.closes_at ?? null,
    focusArea: application.focus_area,
    funderName: parseFunderName(round?.public_notes) ?? "Unassigned funder",
    fundingRequest: application.funding_request,
    id: application.id,
    nextMilestone: nextMilestoneMap[application.status] ?? "Track the current milestone",
    requestedAmountCents: application.requested_amount_cents,
    roundId: application.round_id,
    roundName: round?.name ?? "Grant application",
    status: application.status,
    submittedAt: application.submitted_at,
    summary: statusSummaryMap[application.status] ?? "Activity tracked",
    updatedAt: application.updated_at,
  };
}

function buildRounds(
  rounds: GrantPlatformRoundRow[],
  applications: GrantPlatformWorkspaceData["applications"],
) {
  const existingApplicationByRoundId = new Map(
    applications.map((application) => [application.roundId, application.id]),
  );

  return rounds.map((round) => mapRound(round, existingApplicationByRoundId));
}

function mapRound(
  round: GrantPlatformRoundRow,
  existingApplicationByRoundId: Map<string, string>,
) {
  const program = getRelation(round.grant_programs);

  return {
    availableAwards: round.available_awards,
    awardAmountCents: round.award_amount_cents,
    budgetCents: round.budget_cents,
    closesAt: round.closes_at,
    decisionAt: round.decision_at,
    description: program?.description ?? round.public_notes ?? "",
    existingApplicationId: existingApplicationByRoundId.get(round.id) ?? null,
    id: round.id,
    name: round.name,
    opensAt: round.opens_at,
    programName: program?.name ?? "Olea Gives",
    programType: program?.type ?? "quarterly",
    status: round.status,
  };
}

function buildOrganizationSettings(settings: GrantPlatformSettingsRow | null) {
  return settings
    ? {
        currentAnnualRevenueCents: settings.current_annual_revenue_cents ?? null,
        boardChairEmail: settings.board_chair_email ?? "",
        boardChairName: settings.board_chair_name ?? "",
        boardChairPhone: settings.board_chair_phone ?? "",
        boardChairUserId: settings.board_chair_user_id ?? null,
        charityRegistrationNumber: settings.charity_registration_number ?? "",
        fundingSources: settings.funding_sources ?? [],
        organizationType: settings.organization_type,
        societyNumber: settings.society_number ?? "",
      }
    : {
        boardChairEmail: "",
        boardChairName: "",
        boardChairPhone: "",
        boardChairUserId: null,
        charityRegistrationNumber: "",
        currentAnnualRevenueCents: null,
        fundingSources: [],
        organizationType: "",
        societyNumber: "",
      };
}

function mapPartner(
  partner: GrantPlatformPartnerRow,
  interactions: GrantPlatformFunderInteractionRow[],
) {
  return {
    addedNote: partner.added_note ?? null,
    contactName: partner.contact_name,
    email: partner.email,
    focusAreas: partner.focus_areas,
    id: partner.id,
    interactions: interactions.map(mapFunderInteraction),
    lastCollaboration: partner.last_collaboration ?? null,
    name: partner.name,
    notes: partner.notes,
    partnerType: partner.partner_type,
    phone: partner.phone,
    status: partner.status,
  };
}

function mapFunderInteraction(interaction: GrantPlatformFunderInteractionRow) {
  return {
    contactMethod: interaction.contact_method,
    contactName: interaction.contact_name,
    followUpDate: interaction.follow_up_date ?? null,
    id: interaction.id,
    interactionDate: interaction.interaction_date,
    nextAction: interaction.next_action,
    summary: interaction.summary,
  };
}

function mapVaultItem(item: GrantPlatformVaultRow) {
  return {
    contentType: item.content_type ?? null,
    createdAt: item.created_at,
    fileName: item.file_name,
    id: item.id,
    sizeBytes: item.size_bytes ?? null,
  };
}

function buildTeamMembers(
  members: GrantPlatformMemberRow[],
  profileMap: Map<string, string>,
) {
  return members.map((memberRecord) => ({
    displayName:
      memberRecord.full_name?.trim() ||
      profileMap.get(memberRecord.user_id) ||
      memberRecord.email?.split("@")[0] ||
      memberRecord.user_id,
    email: memberRecord.email ?? "Email on file",
    id: memberRecord.user_id,
    role: memberRecord.role as OrganizationRole,
    source: memberRecord.user_id,
    status: memberRecord.status,
  }));
}

function buildGrantPlatformMetrics(
  rounds: GrantPlatformWorkspaceData["rounds"],
  applications: GrantPlatformWorkspaceData["applications"],
) {
  return [
    {
      detail: "Currently accepting submissions",
      label: "Open rounds",
      value: String(rounds.filter((round) => round.status === "open").length),
    },
    {
      detail: "Tracked across the current organization",
      label: "Applications",
      value: String(applications.length),
    },
    {
      detail: "Approved or granted funding",
      label: "Awarded",
      value: String(
        applications.filter((application) => application.awardStatus === "approved").length,
      ),
    },
    {
      detail: "Deadline-driven opportunities",
      label: "Upcoming closes",
      value: String(rounds.filter((round) => round.closesAt).length),
    },
  ];
}

function interactionsForPartner(
  interactions: GrantPlatformFunderInteractionRow[],
  partnerId: string,
) {
  return interactions.filter((interaction) => interaction.partner_id === partnerId);
}

function parseFunderName(value: string | null | undefined) {
  if (!value) return null;
  const match = /^Funder:\s*(.+)$/im.exec(value);
  return match?.[1]?.trim() || null;
}

function buildWorkflowState(applications: GrantPlatformWorkspaceData["applications"]) {
  return Object.fromEntries(
    applications.map((application) => [
      application.id,
      getGrantPlatformApplicationActionState(application.status),
    ]),
  );
}

function getGrantPlatformSummary(canViewReports: boolean) {
  return canViewReports
    ? "A grant management workspace that brings your funding pipeline, application history, and reporting readiness together in one module."
    : "A grant management workspace that keeps the current grant pipeline and collaboration work visible for your role.";
}

function buildGrantPlatformNotes(canEditOrgProfile: boolean) {
  return [
    {
      label: "Settings editing",
      value: canEditOrgProfile
        ? "Admins can update org settings"
        : "Read-only for your role",
    },
    {
      label: "Partner editing",
      value: canEditOrgProfile
        ? "Admins can manage partner records"
        : "View-only for your role",
    },
    { label: "Vault access", value: "Cross-grant files shared in one place" },
  ];
}

function buildGrantPlatformSections() {
  return [
    {
      description:
        "Use the module to track each funding opportunity, submission status, and next milestone in one place.",
      highlights: [
        "Round-by-round visibility for deadlines and funding size",
        "Submission status for each active application",
        "Clear handoff points for program and leadership review",
      ],
      id: "pipeline",
      title: "Pipeline and opportunity tracking",
    },
    {
      description:
        "Keep the grant team aligned on ownership, evidence collection, and review readiness.",
      highlights: [
        "Shared status tracking for each request",
        "Focus areas and funding request summaries",
        "A simple path for next-step follow-through",
      ],
      id: "workflow",
      title: "Workflow and collaboration",
    },
    {
      description:
        "Turn grant activity into a concise source of truth for leadership and reporting partners.",
      highlights: [
        "Board-ready funder and program summaries",
        "A record of awarded and pending applications",
        "A consistent format for status updates and review",
      ],
      id: "reports",
      title: "Reporting and board visibility",
    },
    {
      description:
        "Use organization-level settings to manage the rules and coordination needed for your grant work.",
      highlights: [
        "Organization context and workflow defaults",
        "Role-based visibility for sensitive work",
        "A secure foundation for reporting and collaboration",
      ],
      id: "settings",
      title: "Settings and access",
    },
  ];
}

function getRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}
