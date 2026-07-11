import "server-only";

import { redirect } from "next/navigation";

import type {
  CommunityEvent,
  CommunityHome,
  CommunityMentionCandidate,
  CommunityPost,
  CommunityPostComment,
  CommunitySpace,
  MembershipTier,
} from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

type DataError = {
  code?: string;
  message?: string;
};

type SpaceAccessRuleRow = {
  plan_id: string;
};

type CommunitySpaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  community_space_access_rules: SpaceAccessRuleRow[] | null;
};

type AuthorAttribution = {
  name: string;
  organizationName: string;
};

type MentionCandidateAccumulator = {
  name: string;
  organizationName: string;
  planIds: Set<MembershipTier>;
};

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isMissingCommunitySchema(error: DataError | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table")
  );
}

function emptyQueryResult<T>() {
  return { data: [] as T[], error: null };
}

function mapSpace(row: CommunitySpaceRow): CommunitySpace {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    allowedPlanIds: (row.community_space_access_rules ?? []).map(
      (rule) => rule.plan_id as MembershipTier,
    ),
  };
}

function mapPost(
  row: {
    id: string;
    space_id: string;
    author_user_id: string;
    kind: CommunityPost["kind"];
    title: string;
    body: string;
    resource_url: string | null;
    pinned_at: string | null;
    created_at: string;
    updated_at: string;
  },
  comments: CommunityPostComment[],
  mentionedUserIds: string[],
  reactions: Array<{ kind: string; user_id: string }>,
  currentUserId: string,
  authorsByUserId: Map<string, AuthorAttribution>,
): CommunityPost {
  const author = authorsByUserId.get(row.author_user_id);

  return {
    id: row.id,
    spaceId: row.space_id,
    authorUserId: row.author_user_id,
    authorName: author?.name ?? "Member",
    authorOrganizationName: author?.organizationName ?? "Member organization",
    kind: row.kind,
    title: row.title,
    body: row.body,
    resourceUrl: safeHttpsUrl(row.resource_url),
    pinnedAt: row.pinned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments,
    mentionedUserIds,
    likeCount: reactions.filter((reaction) => reaction.kind === "helpful").length,
    likedByCurrentUser: reactions.some(
      (reaction) =>
        reaction.kind === "helpful" && reaction.user_id === currentUserId,
    ),
  };
}

function mapComment(
  row: {
    id: string;
    author_user_id: string;
    body: string;
    created_at: string;
    updated_at: string;
  },
  mentionedUserIds: string[],
  reactions: Array<{ kind: string; user_id: string }>,
  currentUserId: string,
  authorsByUserId: Map<string, AuthorAttribution>,
): CommunityPostComment {
  const author = authorsByUserId.get(row.author_user_id);

  return {
    id: row.id,
    authorUserId: row.author_user_id,
    authorName: author?.name ?? "Member",
    authorOrganizationName: author?.organizationName ?? "Member organization",
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mentionedUserIds,
    likeCount: reactions.filter((reaction) => reaction.kind === "helpful").length,
    likedByCurrentUser: reactions.some(
      (reaction) =>
        reaction.kind === "helpful" && reaction.user_id === currentUserId,
    ),
  };
}

function mapEvent(row: {
  id: string;
  space_id: string | null;
  title: string;
  summary: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  zoom_url: string | null;
  recording_url: string | null;
  status: CommunityEvent["status"];
}): CommunityEvent {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    summary: row.summary,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    zoomUrl: safeHttpsUrl(row.zoom_url),
    recordingUrl: safeHttpsUrl(row.recording_url),
    status: row.status,
  };
}

async function getMentionCandidates(
  currentUserId: string,
): Promise<CommunityMentionCandidate[]> {
  const admin = createAdminClient();
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("organization_id, plan_id")
    .in("status", ["active", "trialing"]);

  if (subscriptionsError) throw subscriptionsError;

  const activeSubscriptions = subscriptions ?? [];
  const activeOrganizationIds = Array.from(
    new Set(
      activeSubscriptions.map((subscription) => subscription.organization_id),
    ),
  );
  if (!activeOrganizationIds.length) return [];

  const { data: memberships, error: membershipsError } = await admin
    .from("organization_members")
    .select("user_id, organization_id")
    .in("organization_id", activeOrganizationIds)
    .eq("status", "active");

  if (membershipsError) throw membershipsError;

  const memberRows = memberships ?? [];
  const userIds = Array.from(
    new Set(
      memberRows
        .map((membership) => membership.user_id)
        .filter((userId) => userId !== currentUserId),
    ),
  );
  if (!userIds.length) return [];

  const [{ data: profiles, error: profilesError }, { data: organizations, error: organizationsError }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name").in("id", userIds),
      admin
        .from("organizations")
        .select("id, name")
        .in("id", activeOrganizationIds),
    ]);

  if (profilesError) throw profilesError;
  if (organizationsError) throw organizationsError;

  const profileNameByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name?.trim()]),
  );
  const organizationNameById = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization.name?.trim(),
    ]),
  );

  const planIdsByOrganizationId = new Map<string, Set<MembershipTier>>();
  for (const subscription of activeSubscriptions) {
    const plans =
      planIdsByOrganizationId.get(subscription.organization_id) ??
      new Set<MembershipTier>();
    plans.add(subscription.plan_id as MembershipTier);
    planIdsByOrganizationId.set(subscription.organization_id, plans);
  }

  const candidatesByUserId = new Map<string, MentionCandidateAccumulator>();
  for (const membership of memberRows) {
    if (membership.user_id === currentUserId) continue;

    const organizationName = organizationNameById.get(membership.organization_id);
    const name = profileNameByUserId.get(membership.user_id);
    const planIds = planIdsByOrganizationId.get(membership.organization_id);
    if (!organizationName || !name || !planIds?.size) continue;

    const existing = candidatesByUserId.get(membership.user_id);
    if (existing) {
      for (const planId of planIds) existing.planIds.add(planId);
      continue;
    }

    candidatesByUserId.set(membership.user_id, {
      name,
      organizationName,
      planIds: new Set(planIds),
    });
  }

  return Array.from(candidatesByUserId.entries())
    .map(([userId, candidate]) => ({
      userId,
      name: candidate.name,
      organizationName: candidate.organizationName,
      planIds: Array.from(candidate.planIds).sort() as MembershipTier[],
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCommunityHome(): Promise<CommunityHome | null> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription?.status ?? "")) {
    redirect("/subscription?billing=required");
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, slug, name, description")
    .eq("slug", "olea-connects")
    .maybeSingle();

  if (isMissingCommunitySchema(communityError)) {
    console.warn(
      "Native community schema is not available; showing community placeholder.",
    );
    return null;
  }
  if (communityError) throw communityError;
  if (!community) return null;

  const [
    { data: spaces, error: spacesError },
    { data: posts, error: postsError },
    { data: events, error: eventsError },
    { data: managerRows, error: managerError },
  ] = await Promise.all([
    supabase
      .from("community_spaces")
      .select(
        "id, slug, name, description, sort_order, community_space_access_rules(plan_id)",
      )
      .eq("community_id", community.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("community_posts")
      .select(
        "id, space_id, author_user_id, kind, title, body, resource_url, pinned_at, created_at, updated_at",
      )
      .eq("community_id", community.id)
      .eq("status", "published")
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("community_events")
      .select(
        "id, space_id, title, summary, starts_at, ends_at, timezone, zoom_url, recording_url, status",
      )
      .eq("community_id", community.id)
      .in("status", ["scheduled", "live"])
      .order("starts_at", { ascending: true })
      .limit(4),
    supabase
      .from("community_managers")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", member.id),
  ]);

  if (
    isMissingCommunitySchema(spacesError) ||
    isMissingCommunitySchema(postsError) ||
    isMissingCommunitySchema(eventsError) ||
    isMissingCommunitySchema(managerError)
  ) {
    console.warn(
      "Native community schema is incomplete; showing community placeholder.",
    );
    return null;
  }
  if (spacesError) throw spacesError;
  if (postsError) throw postsError;
  if (eventsError) throw eventsError;
  if (managerError) throw managerError;

  const postRows = posts ?? [];
  const postIds = postRows.map((post) => post.id);
  const [commentsResult, reactionsResult, postMentionsResult] = postIds.length
    ? await Promise.all([
        supabase
          .from("community_comments")
          .select("id, post_id, author_user_id, body, created_at, updated_at")
          .in("post_id", postIds)
          .is("hidden_at", null)
          .order("created_at", { ascending: true }),
        supabase
          .from("community_reactions")
          .select("post_id, comment_id, user_id, kind")
          .in("post_id", postIds),
        supabase
          .from("community_mentions")
          .select("post_id, mentioned_user_id")
          .in("post_id", postIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (commentsResult.error) throw commentsResult.error;
  if (reactionsResult.error) throw reactionsResult.error;
  if (
    postMentionsResult.error &&
    !isMissingCommunitySchema(postMentionsResult.error)
  ) {
    throw postMentionsResult.error;
  }

  const postMentionRows = isMissingCommunitySchema(postMentionsResult.error)
    ? []
    : (postMentionsResult.data ?? []);

  const commentRows = commentsResult.data ?? [];
  const commentIds = commentRows.map((comment) => comment.id);
  const commentMentionsResult = commentIds.length
    ? await supabase
        .from("community_mentions")
        .select("comment_id, mentioned_user_id")
        .in("comment_id", commentIds)
    : emptyQueryResult<{ comment_id: string | null; mentioned_user_id: string }>();

  if (
    commentMentionsResult.error &&
    !isMissingCommunitySchema(commentMentionsResult.error)
  ) {
    throw commentMentionsResult.error;
  }

  const commentMentionRows = isMissingCommunitySchema(
    commentMentionsResult.error,
  )
    ? []
    : (commentMentionsResult.data ?? []);

  const authorUserIds = new Set<string>();
  for (const post of postRows) authorUserIds.add(post.author_user_id);
  for (const comment of commentRows) {
    authorUserIds.add(comment.author_user_id);
  }

  const authorsByUserId = new Map<string, AuthorAttribution>();
  if (authorUserIds.size) {
    const admin = createAdminClient();
    const [profilesResult, membershipsResult] = await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(authorUserIds)),
      admin
        .from("organization_members")
        .select("user_id, organizations(name)")
        .in("user_id", Array.from(authorUserIds))
        .eq("status", "active"),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (membershipsResult.error) throw membershipsResult.error;

    for (const profile of profilesResult.data ?? []) {
      const name = profile.full_name?.trim();
      if (name) {
        authorsByUserId.set(profile.id, {
          name,
          organizationName: "Member organization",
        });
      }
    }

    for (const membership of membershipsResult.data ?? []) {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;
      const organizationName = organization?.name?.trim();
      if (!organizationName) continue;

      const existing = authorsByUserId.get(membership.user_id);
      authorsByUserId.set(membership.user_id, {
        name: existing?.name ?? "Member",
        organizationName,
      });
    }
  }

  const mentionCandidates = await getMentionCandidates(member.id);
  const commentsByPostId = new Map<string, CommunityPostComment[]>();
  const mentionedUserIdsByPostId = new Map<string, string[]>();
  const mentionedUserIdsByCommentId = new Map<string, string[]>();
  const reactionsByPostId = new Map<
    string,
    Array<{ kind: string; user_id: string }>
  >();
  const reactionsByCommentId = new Map<
    string,
    Array<{ kind: string; user_id: string }>
  >();
  for (const reaction of reactionsResult.data ?? []) {
    const mappedReaction = {
      kind: reaction.kind,
      user_id: reaction.user_id,
    };

    if (reaction.comment_id) {
      const commentReactions = reactionsByCommentId.get(reaction.comment_id) ?? [];
      commentReactions.push(mappedReaction);
      reactionsByCommentId.set(reaction.comment_id, commentReactions);
      continue;
    }

    const postReactions = reactionsByPostId.get(reaction.post_id) ?? [];
    postReactions.push(mappedReaction);
    reactionsByPostId.set(reaction.post_id, postReactions);
  }

  for (const mention of postMentionRows) {
    if (!mention.post_id) continue;
    const mentionedUserIds = mentionedUserIdsByPostId.get(mention.post_id) ?? [];
    mentionedUserIds.push(mention.mentioned_user_id);
    mentionedUserIdsByPostId.set(mention.post_id, mentionedUserIds);
  }

  for (const mention of commentMentionRows) {
    if (!mention.comment_id) continue;
    const mentionedUserIds =
      mentionedUserIdsByCommentId.get(mention.comment_id) ?? [];
    mentionedUserIds.push(mention.mentioned_user_id);
    mentionedUserIdsByCommentId.set(mention.comment_id, mentionedUserIds);
  }

  for (const comment of commentRows) {
    const postComments = commentsByPostId.get(comment.post_id) ?? [];
    postComments.push(
      mapComment(
        comment,
        mentionedUserIdsByCommentId.get(comment.id) ?? [],
        reactionsByCommentId.get(comment.id) ?? [],
        member.id,
        authorsByUserId,
      ),
    );
    commentsByPostId.set(comment.post_id, postComments);
  }

  return {
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    spaces: ((spaces ?? []) as CommunitySpaceRow[]).map(mapSpace),
    posts: postRows.map((post) =>
      mapPost(
        post,
        commentsByPostId.get(post.id) ?? [],
        mentionedUserIdsByPostId.get(post.id) ?? [],
        reactionsByPostId.get(post.id) ?? [],
        member.id,
        authorsByUserId,
      ),
    ),
    events: (events ?? []).map(mapEvent),
    mentionCandidates,
    canManage: Boolean(managerRows?.length),
    currentUserId: member.id,
  };
}
