import "server-only";

import { redirect } from "next/navigation";

import type {
  CommunityEvent,
  CommunityHome,
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
  const [commentsResult, reactionsResult] = postIds.length
    ? await Promise.all([
        supabase
          .from("community_comments")
          .select("id, post_id, author_user_id, body, created_at, updated_at")
          .in("post_id", postIds)
          .is("hidden_at", null)
          .order("created_at", { ascending: true }),
        supabase
          .from("community_reactions")
          .select("post_id, user_id, kind")
          .in("post_id", postIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (commentsResult.error) throw commentsResult.error;
  if (reactionsResult.error) throw reactionsResult.error;

  const authorUserIds = new Set<string>();
  for (const post of postRows) authorUserIds.add(post.author_user_id);
  for (const comment of commentsResult.data ?? []) {
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

  const commentsByPostId = new Map<string, CommunityPostComment[]>();
  for (const comment of commentsResult.data ?? []) {
    const postComments = commentsByPostId.get(comment.post_id) ?? [];
    postComments.push(mapComment(comment, authorsByUserId));
    commentsByPostId.set(comment.post_id, postComments);
  }

  const reactionsByPostId = new Map<
    string,
    Array<{ kind: string; user_id: string }>
  >();
  for (const reaction of reactionsResult.data ?? []) {
    const postReactions = reactionsByPostId.get(reaction.post_id) ?? [];
    postReactions.push({
      kind: reaction.kind,
      user_id: reaction.user_id,
    });
    reactionsByPostId.set(reaction.post_id, postReactions);
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
        reactionsByPostId.get(post.id) ?? [],
        member.id,
        authorsByUserId,
      ),
    ),
    events: (events ?? []).map(mapEvent),
    canManage: Boolean(managerRows?.length),
    currentUserId: member.id,
  };
}
