import type { CommunityMentionCandidate, MembershipTier } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

import type { ActiveSubscriptionRow } from "./community-shared";

type MembershipRow = {
  organization_id: string;
  user_id: string;
};

type MentionCandidateAccumulator = {
  name: string;
  organizationName: string;
  planIds: Set<MembershipTier>;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

export async function getMentionCandidates(
  currentUserId: string,
): Promise<CommunityMentionCandidate[]> {
  const admin = createAdminClient();
  const activeSubscriptions = await fetchActiveSubscriptions(admin);
  const activeOrganizationIds = getActiveOrganizationIds(activeSubscriptions);
  if (!activeOrganizationIds.length) return [];

  const memberships = await fetchActiveMemberships(admin, activeOrganizationIds);
  const userIds = getCandidateUserIds(memberships, currentUserId);
  if (!userIds.length) return [];

  const lookups = await fetchCandidateLookups(admin, userIds, activeOrganizationIds);
  return buildMentionCandidates({
    currentUserId,
    memberships,
    organizationNameById: lookups.organizationNameById,
    planIdsByOrganizationId: buildPlanLookup(activeSubscriptions),
    profileNameByUserId: lookups.profileNameByUserId,
  });
}

async function fetchActiveSubscriptions(admin: SupabaseAdminClient) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("organization_id, plan_id")
    .in("status", ["active", "trialing"]);

  if (error) throw error;
  return (data ?? []) as ActiveSubscriptionRow[];
}

function getActiveOrganizationIds(activeSubscriptions: ActiveSubscriptionRow[]) {
  return Array.from(
    new Set(activeSubscriptions.map((subscription) => subscription.organization_id)),
  );
}

async function fetchActiveMemberships(
  admin: SupabaseAdminClient,
  activeOrganizationIds: string[],
) {
  const { data, error } = await admin
    .from("organization_members")
    .select("user_id, organization_id")
    .in("organization_id", activeOrganizationIds)
    .eq("status", "active");

  if (error) throw error;
  return (data ?? []) as MembershipRow[];
}

function getCandidateUserIds(memberships: MembershipRow[], currentUserId: string) {
  return Array.from(
    new Set(
      memberships
        .map((membership) => membership.user_id)
        .filter((userId) => userId !== currentUserId),
    ),
  );
}

async function fetchCandidateLookups(
  admin: SupabaseAdminClient,
  userIds: string[],
  activeOrganizationIds: string[],
) {
  const [profilesResult, organizationsResult] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", userIds),
    admin.from("organizations").select("id, name").in("id", activeOrganizationIds),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (organizationsResult.error) throw organizationsResult.error;

  return {
    organizationNameById: new Map(
      (organizationsResult.data ?? []).map((organization) => [
        organization.id,
        organization.name?.trim(),
      ]),
    ),
    profileNameByUserId: new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.full_name?.trim(),
      ]),
    ),
  };
}

function buildPlanLookup(activeSubscriptions: ActiveSubscriptionRow[]) {
  const planIdsByOrganizationId = new Map<string, Set<MembershipTier>>();

  for (const subscription of activeSubscriptions) {
    const plans = planIdsByOrganizationId.get(subscription.organization_id) ?? new Set();
    plans.add(subscription.plan_id);
    planIdsByOrganizationId.set(subscription.organization_id, plans);
  }

  return planIdsByOrganizationId;
}

type BuildMentionCandidatesInput = {
  currentUserId: string;
  memberships: MembershipRow[];
  organizationNameById: Map<string, string | undefined>;
  planIdsByOrganizationId: Map<string, Set<MembershipTier>>;
  profileNameByUserId: Map<string, string | undefined>;
};

function buildMentionCandidates(input: BuildMentionCandidatesInput) {
  const candidatesByUserId = new Map<string, MentionCandidateAccumulator>();

  for (const membership of input.memberships) {
    addMentionCandidate(candidatesByUserId, membership, input);
  }

  return Array.from(candidatesByUserId.entries())
    .map(([userId, candidate]) => ({
      name: candidate.name,
      organizationName: candidate.organizationName,
      planIds: Array.from(candidate.planIds).sort() as MembershipTier[],
      userId,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function addMentionCandidate(
  candidatesByUserId: Map<string, MentionCandidateAccumulator>,
  membership: MembershipRow,
  input: BuildMentionCandidatesInput,
) {
  if (membership.user_id === input.currentUserId) return;

  const organizationName = input.organizationNameById.get(membership.organization_id);
  const name = input.profileNameByUserId.get(membership.user_id);
  const planIds = input.planIdsByOrganizationId.get(membership.organization_id);
  if (!organizationName || !name || !planIds?.size) return;

  const existing = candidatesByUserId.get(membership.user_id);
  if (existing) {
    for (const planId of planIds) existing.planIds.add(planId);
    return;
  }

  candidatesByUserId.set(membership.user_id, {
    name,
    organizationName,
    planIds: new Set(planIds),
  });
}
