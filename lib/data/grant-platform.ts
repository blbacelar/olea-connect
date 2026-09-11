import "server-only";

import { requireMemberContext } from "@/lib/data/member-context";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { getGrantPlatformApplicationActionState } from "@/lib/grants/workflow";
import { createClient } from "@/utils/supabase/server";

import { buildGrantPlatformWorkspaceData } from "./grant-platform-mappers";
import {
  loadGrantPlatformProfileMap,
  loadGrantPlatformRows,
} from "./grant-platform-queries";

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
    funderName: string;
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
    societyNumber: string;
    charityRegistrationNumber: string;
    boardChairUserId: string | null;
    boardChairName: string;
    boardChairEmail: string;
    boardChairPhone: string;
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
    interactions: Array<{
      id: string;
      contactMethod: string;
      contactName: string;
      interactionDate: string;
      summary: string;
      nextAction: string;
      followUpDate: string | null;
    }>;
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

export async function getGrantPlatformData(): Promise<GrantPlatformWorkspaceData> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const access = getGrantPlatformUiAccess(member.role);
  const rows = await loadGrantPlatformRows(supabase, organization.id);
  const profileMap = await loadGrantPlatformProfileMap(supabase, rows.members);

  return buildGrantPlatformWorkspaceData({
    access,
    funderInteractions: rows.funderInteractions,
    members: rows.members,
    organization,
    organizationRecord: rows.organizationRecord,
    organizationSettings: rows.organizationSettings,
    partners: rows.partners,
    profileMap,
    rawApplications: rows.applications,
    rawRounds: rows.rounds,
    vaultItems: rows.vaultItems,
  });
}
