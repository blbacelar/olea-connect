import "server-only";

import { requireMemberContext } from "@/lib/data/member-context";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { getGrantPlatformApplicationActionState } from "@/lib/grants/workflow";
import { createClient } from "@/utils/supabase/server";

type GrantPlatformStatusNote = {
  label: string;
  value: string;
};

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
  organizationSettings: {
    organizationType: string;
    currentAnnualRevenueCents: number | null;
    fundingSources: string[];
  };
  teamMembers: Array<{
    id: string;
    displayName: string;
    email: string;
    role: string;
    status: string;
    source: string;
  }>;
  partners: Array<{
    id: string;
    name: string;
    partnerType: string;
    contactName: string;
    email: string;
    phone: string;
    focusAreas: string;
    status: string;
    notes: string;
    lastCollaboration: string | null;
    addedNote: string | null;
  }>;
  vaultItems: Array<{
    id: string;
    fileName: string;
    contentType: string | null;
    sizeBytes: number | null;
    createdAt: string;
  }>;
  notes: GrantPlatformStatusNote[];
}

function formatCurrencyValue(cents: number | null) {
  if (cents === null) return "$0";

  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function buildDefaultPartners(organizationName: string) {
  return [
    {
      id: `${organizationName}-partner-1`,
      name: "Community Arts Centre",
      partnerType: "Community Organization",
      contactName: "Sarah Johnson",
      email: "sarah@artscentre.org",
      phone: "(604) 555-0123",
      focusAreas: "Arts, Culture, Youth Programs",
      status: "Active Collaborator",
      notes: "Strong community reach. Excellent for youth engagement and cultural programming.",
      lastCollaboration: "Last collaborated: BC Community Gaming Grant",
      addedNote: null,
    },
    {
      id: `${organizationName}-partner-2`,
      name: "University Research Lab",
      partnerType: "Academic Institution",
      contactName: "Dr. Michael Chen",
      email: "m.chen@university.edu",
      phone: "(604) 555-0124",
      focusAreas: "Research, Innovation, Data Analysis",
      status: "Good for Evaluation",
      notes: "Excellent for program evaluation and research partnerships. Can provide data analysis and impact measurement.",
      lastCollaboration: "Added: January 2026",
      addedNote: null,
    },
    {
      id: `${organizationName}-partner-3`,
      name: "City Health Department",
      partnerType: "Government Agency",
      contactName: "Jennifer Lee",
      email: "j.lee@health.city.gov",
      phone: "(604) 555-0125",
      focusAreas: "Public Health, Community Development",
      status: "Strategic Partner",
      notes: "Key government connection for health-related grants. Strong credibility in policy environment.",
      lastCollaboration: "Last collaborated: Health & Wellness Program",
      addedNote: null,
    },
    {
      id: `${organizationName}-partner-4`,
      name: "Local Foundation Board Member",
      partnerType: "Individual / Board Advisor",
      contactName: "David Martinez",
      email: "david@localfoundation.org",
      phone: "(604) 555-0126",
      focusAreas: "Funding Connections, Mentorship",
      status: "Potential Collaborator",
      notes: "Strong board connections. Good for funder introductions and strategic advice.",
      lastCollaboration: "Added: December 2025",
      addedNote: null,
    },
  ];
}

function buildDefaultVaultItems() {
  return [
    {
      id: "vault-template-1",
      fileName: "Board report template.pdf",
      contentType: "application/pdf",
      sizeBytes: 1048576,
      createdAt: new Date("2026-07-18T10:00:00.000Z").toISOString(),
    },
    {
      id: "vault-template-2",
      fileName: "Funding narrative guide.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 786432,
      createdAt: new Date("2026-07-18T10:05:00.000Z").toISOString(),
    },
    {
      id: "vault-template-3",
      fileName: "Evaluation evidence pack.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 524288,
      createdAt: new Date("2026-07-18T10:10:00.000Z").toISOString(),
    },
  ];
}

export async function getGrantPlatformData(): Promise<GrantPlatformWorkspaceData> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { canEditOrgProfile, canViewBudgets, canViewReports } = getGrantPlatformUiAccess(member.role);

  const [organizationRecordResult, settingsResult, roundsResult, applicationsResult, partnersResult, membersResult, vaultResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", organization.id).maybeSingle(),
    supabase
      .from("grant_organization_settings")
      .select("organization_type, current_annual_revenue_cents, funding_sources")
      .eq("organization_id", organization.id)
      .maybeSingle(),
    supabase
      .from("grant_rounds")
      .select("id, name, status, opens_at, closes_at, decision_at, award_amount_cents, available_awards, budget_cents, public_notes, grant_programs(name, type, description)")
      .order("opens_at", { ascending: true }),
    supabase
      .from("grant_applications")
      .select("id, round_id, status, focus_area, funding_request, requested_amount_cents, submitted_at, collaboration_note, updated_at, grant_rounds(name, closes_at), grant_awards(status)")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("grant_partners")
      .select("id, name, partner_type, contact_name, email, phone, focus_areas, status, notes, last_collaboration, added_note, updated_at")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("user_id, role, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("grant_application_attachments")
      .select("id, file_name, content_type, size_bytes, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: organizationRecord, error: organizationError } = organizationRecordResult;
  const { data: organizationSettings, error: settingsError } = settingsResult;
  const { data: rounds, error: roundsError } = roundsResult;
  const { data: applications, error: applicationsError } = applicationsResult;
  const { data: partners, error: partnersError } = partnersResult;
  const { data: members, error: membersError } = membersResult;
  const { data: vaultItems, error: vaultError } = vaultResult;

  if (organizationError) console.error("grant-platform: failed to load organization record", organizationError);
  if (settingsError) console.error("grant-platform: failed to load organization settings", settingsError);
  if (roundsError) console.error("grant-platform: failed to load grant rounds", roundsError);
  if (applicationsError) console.error("grant-platform: failed to load grant applications", applicationsError);
  if (partnersError) console.error("grant-platform: failed to load grant partners", partnersError);
  if (membersError) console.error("grant-platform: failed to load organization members", membersError);
  if (vaultError) console.error("grant-platform: failed to load vault items", vaultError);

  const safeRounds = roundsError ? [] : rounds ?? [];
  const safeApplications = applicationsError ? [] : applications ?? [];
  const safePartners = partnersError ? [] : partners ?? [];
  const safeMembers = membersError ? [] : members ?? [];
  const safeVaultItems = vaultError ? [] : vaultItems ?? [];

  const profileIds = safeMembers.map((memberRecord) => memberRecord.user_id);
  const profileMap = new Map<string, string>();

  if (profileIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);

    if (profilesError) {
      console.error("grant-platform: failed to load member profiles", profilesError);
    } else {
      for (const profile of profiles ?? []) {
        profileMap.set(profile.id, profile.full_name?.trim() || profile.id);
      }
    }
  }

  const visibleApplications = safeApplications.filter((application) => {
    if (canViewReports || canViewBudgets) return true;
    return application.status !== "approved" && application.status !== "declined";
  });

  const statusSummaryMap: Record<string, string> = {
    draft: "Draft package in progress",
    submitted: "Submitted and awaiting review",
    in_review: "Under review by the team",
    shortlisted: "Shortlisted for follow-up",
    approved: "Awarded and ready for delivery",
    declined: "Declined and needs review",
    withdrawn: "Withdrawn by the applicant",
  };

  const nextMilestoneMap: Record<string, string> = {
    draft: "Gather evidence and finalize the narrative",
    submitted: "Prepare the review package and follow-up notes",
    in_review: "Collect stakeholder feedback and decisions",
    shortlisted: "Confirm the next decision checkpoint",
    approved: "Kick off reporting and delivery milestones",
    declined: "Review learning notes and eligibility gaps",
    withdrawn: "Archive the request and note the decision",
  };

  const normalizedApplications = visibleApplications.map((application) => {
    const round = Array.isArray(application.grant_rounds) ? application.grant_rounds[0] : application.grant_rounds;
    const award = Array.isArray(application.grant_awards) ? application.grant_awards[0] : application.grant_awards;

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
      summary: statusSummaryMap[application.status] ?? "Activity tracked",
      nextMilestone: nextMilestoneMap[application.status] ?? "Track the current milestone",
    };
  });

  const existingApplicationByRoundId = new Map(normalizedApplications.map((application) => [application.roundId, application.id]));

  const normalizedRounds = safeRounds.map((round) => {
    const program = Array.isArray(round.grant_programs) ? round.grant_programs[0] : round.grant_programs;

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

  const fallbackSettings = {
    organizationType: "Growing ($250K-$1M)",
    currentAnnualRevenueCents: 45000000,
    fundingSources: ["Foundation Grants", "Individual Donors", "Earned Revenue"],
  };

  const settings = organizationSettings
    ? {
        organizationType: organizationSettings.organization_type,
        currentAnnualRevenueCents: organizationSettings.current_annual_revenue_cents ?? null,
        fundingSources: organizationSettings.funding_sources ?? [],
      }
    : fallbackSettings;

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

  const partnersFromDb = safePartners.length
    ? safePartners.map((partner) => ({
        addedNote: partner.added_note ?? null,
        contactName: partner.contact_name,
        email: partner.email,
        focusAreas: partner.focus_areas,
        id: partner.id,
        lastCollaboration: partner.last_collaboration ?? null,
        name: partner.name,
        notes: partner.notes,
        partnerType: partner.partner_type,
        phone: partner.phone,
        status: partner.status,
      }))
    : buildDefaultPartners(organizationRecord?.name ?? organization.name);
  const vaultFromDb = safeVaultItems.length
    ? safeVaultItems.map((item) => ({
        contentType: item.content_type ?? null,
        createdAt: item.created_at,
        fileName: item.file_name,
        id: item.id,
        sizeBytes: item.size_bytes ?? null,
      }))
    : buildDefaultVaultItems();
  const teamMembers = safeMembers.map((memberRecord) => ({
    id: memberRecord.user_id,
    displayName: profileMap.get(memberRecord.user_id) ?? memberRecord.user_id,
    email: "Email on file",
    role: memberRecord.role,
    status: memberRecord.status,
    source: memberRecord.user_id,
  }));

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
    organizationSettings: settings,
    teamMembers,
    partners: partnersFromDb,
    vaultItems: vaultFromDb,
    notes: [
      { label: "Settings editing", value: canEditOrgProfile ? "Admins can update org settings" : "Read-only for your role" },
      { label: "Partner editing", value: canEditOrgProfile ? "Admins can manage partner records" : "View-only for your role" },
      { label: "Vault access", value: "Cross-grant files shared in one place" },
    ],
  };
}
