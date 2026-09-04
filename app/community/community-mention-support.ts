import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type MentionTarget =
  | {
      communityId: string;
      postId: string;
      spaceId: string;
      targetType: "post";
    }
  | {
      commentId: string;
      communityId: string;
      spaceId: string;
      targetType: "comment";
    };

type SpaceAccess = {
  communities?: { status?: string } | { status?: string }[] | null;
  community_space_access_rules?: { plan_id: string }[] | null;
  status?: string | null;
};

type OrganizationMembership = {
  organization_id: string;
  user_id: string;
};

type OrganizationSubscription = {
  organization_id: string;
  plan_id: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export function getMentionedUserIds(formData: FormData, currentUserId: string) {
  return Array.from(
    new Set(
      formData
        .getAll("mentionedUserIds")
        .map((value) => String(value).trim())
        .filter((value) => uuidPattern.test(value) && value !== currentUserId),
    ),
  );
}

export async function syncCommunityMentions({
  actorUserId,
  formData,
  target,
}: {
  actorUserId: string;
  formData: FormData;
  target: MentionTarget;
}) {
  const mentionedUserIds = await filterMentionedUsersForSpace(
    target.spaceId,
    getMentionedUserIds(formData, actorUserId),
  );
  const supabase = await createClient();
  const targetColumn = target.targetType === "post" ? "post_id" : "comment_id";
  const targetId =
    target.targetType === "post" ? target.postId : target.commentId;

  const { error: deleteError } = await supabase
    .from("community_mentions")
    .delete()
    .eq(targetColumn, targetId);

  if (isMissingOptionalCommunityMentions(deleteError)) return;
  if (deleteError) throw deleteError;
  if (!mentionedUserIds.length) return;

  const { error: insertError } = await supabase.from("community_mentions").insert(
    mentionedUserIds.map((mentionedUserId) => ({
      comment_id: target.targetType === "comment" ? target.commentId : null,
      community_id: target.communityId,
      mentioned_by_user_id: actorUserId,
      mentioned_user_id: mentionedUserId,
      post_id: target.targetType === "post" ? target.postId : null,
      space_id: target.spaceId,
    })),
  );

  if (isMissingOptionalCommunityMentions(insertError)) return;
  if (insertError) throw insertError;
}

function isMissingOptionalCommunityMentions(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "PGRST205" ||
    maybeError.message?.includes("Could not find the table") === true
  );
}

async function filterMentionedUsersForSpace(
  spaceId: string,
  mentionedUserIds: string[],
) {
  if (!mentionedUserIds.length) return [];

  const { memberships, space, subscriptions } =
    await getMentionAccessData(spaceId, mentionedUserIds);
  if (!canMentionInSpace(space)) return [];

  const allowedPlanIds = getAllowedPlanIds(space);
  const plansByOrganizationId = getPlansByOrganizationId(subscriptions);
  return memberships
    .filter((membership) =>
      hasMentionAccess(membership, plansByOrganizationId, allowedPlanIds),
    )
    .map((membership) => membership.user_id);
}

async function getMentionAccessData(
  spaceId: string,
  mentionedUserIds: string[],
) {
  const admin = createAdminClient();
  const [{ data: space, error: spaceError }, membershipsResult] =
    await Promise.all([
      admin
        .from("community_spaces")
        .select(
          "id, status, community_space_access_rules(plan_id), communities(status)",
        )
        .eq("id", spaceId)
        .maybeSingle(),
      admin
        .from("organization_members")
        .select("user_id, organization_id")
        .in("user_id", mentionedUserIds)
        .eq("status", "active"),
    ]);

  if (spaceError) throw spaceError;
  if (membershipsResult.error) throw membershipsResult.error;

  const memberships = (membershipsResult.data ?? []) as OrganizationMembership[];
  const subscriptions = await getMentionSubscriptions(memberships);
  return { memberships, space: space as SpaceAccess | null, subscriptions };
}

async function getMentionSubscriptions(memberships: OrganizationMembership[]) {
  const organizationIds = Array.from(
    new Set(memberships.map((membership) => membership.organization_id)),
  );
  if (!organizationIds.length) return [];

  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select("organization_id, plan_id")
    .in("organization_id", organizationIds)
    .in("status", ["active", "trialing"]);

  if (error) throw error;
  return (data ?? []) as OrganizationSubscription[];
}

function canMentionInSpace(space: SpaceAccess | null) {
  if (!space || space.status !== "active") return false;
  const community = Array.isArray(space.communities)
    ? space.communities[0]
    : space.communities;

  return community?.status === "active";
}

function getAllowedPlanIds(space: SpaceAccess | null) {
  return new Set(
    (space?.community_space_access_rules ?? []).map((rule) => rule.plan_id),
  );
}

function getPlansByOrganizationId(subscriptions: OrganizationSubscription[]) {
  const plansByOrganizationId = new Map<string, string[]>();
  for (const subscription of subscriptions) {
    const plans =
      plansByOrganizationId.get(subscription.organization_id) ?? [];
    plans.push(subscription.plan_id);
    plansByOrganizationId.set(subscription.organization_id, plans);
  }
  return plansByOrganizationId;
}

function hasMentionAccess(
  membership: OrganizationMembership,
  plansByOrganizationId: Map<string, string[]>,
  allowedPlanIds: Set<string>,
) {
  const plans = plansByOrganizationId.get(membership.organization_id);
  if (!plans?.length) return false;

  return (
    allowedPlanIds.size === 0 ||
    plans.some((planId) => allowedPlanIds.has(planId))
  );
}
