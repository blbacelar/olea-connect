import { redirect } from "next/navigation";

import { logWarn } from "@/lib/observability/logger";

import type {
  CommunityCommentMentionRow,
  CommunityCommentRow,
  CommunityEventRow,
  CommunityPostMentionRow,
  CommunityPostRow,
  CommunityReactionRow,
  CommunityRecord,
  CommunitySpaceRow,
} from "./community-mappers";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  emptyQueryResult,
  isMissingCommunitySchema,
} from "./community-shared";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/utils/supabase/server").createClient>
>;

type CoreCommunityData = {
  canManage: boolean;
  events: CommunityEventRow[];
  posts: CommunityPostRow[];
  spaces: CommunitySpaceRow[];
};

export async function ensureActiveCommunitySubscription(
  supabase: SupabaseServerClient,
  organizationId: string,
) {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription?.status ?? "")) {
    redirect("/subscription?billing=required");
  }
}

export async function fetchCommunityRecord(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("communities")
    .select("id, slug, name, description")
    .eq("slug", "olea-connects")
    .maybeSingle();

  if (isMissingCommunitySchema(error)) {
    logWarn("Native community schema is not available; showing community placeholder.");
    return null;
  }
  if (error) throw error;
  return data as CommunityRecord | null;
}

export async function fetchCoreCommunityData(
  supabase: SupabaseServerClient,
  communityId: string,
  userId: string,
): Promise<CoreCommunityData | null> {
  const results = await Promise.all([
    fetchCommunitySpaces(supabase, communityId),
    fetchCommunityPosts(supabase, communityId),
    fetchCommunityEvents(supabase, communityId),
    fetchCommunityManagerRows(supabase, communityId, userId),
  ]);

  if (results.some((result) => isMissingCommunitySchema(result.error))) {
    logWarn("Native community schema is incomplete; showing community placeholder.");
    return null;
  }

  const [spacesResult, postsResult, eventsResult, managersResult] = results;
  throwFirstError(results);

  return {
    canManage: Boolean(managersResult.data?.length),
    events: (eventsResult.data ?? []) as CommunityEventRow[],
    posts: (postsResult.data ?? []) as CommunityPostRow[],
    spaces: (spacesResult.data ?? []) as CommunitySpaceRow[],
  };
}

export async function fetchPostDetails(
  supabase: SupabaseServerClient,
  postIds: string[],
) {
  const { comments, postMentions, reactions } = await fetchPostLevelDetails(
    supabase,
    postIds,
  );
  const commentMentions = await fetchCommentMentions(
    supabase,
    comments.map((comment) => comment.id),
  );

  return { commentMentions, comments, postMentions, reactions };
}

function fetchCommunitySpaces(supabase: SupabaseServerClient, communityId: string) {
  return supabase
    .from("community_spaces")
    .select(
      "id, slug, name, description, sort_order, community_space_access_rules(plan_id)",
    )
    .eq("community_id", communityId)
    .order("sort_order", { ascending: true });
}

function fetchCommunityPosts(supabase: SupabaseServerClient, communityId: string) {
  return supabase
    .from("community_posts")
    .select(
      "id, space_id, author_user_id, kind, title, body, resource_url, pinned_at, created_at, updated_at",
    )
    .eq("community_id", communityId)
    .eq("status", "published")
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
}

function fetchCommunityEvents(supabase: SupabaseServerClient, communityId: string) {
  return supabase
    .from("community_events")
    .select(
      "id, space_id, title, summary, starts_at, ends_at, timezone, zoom_url, recording_url, status",
    )
    .eq("community_id", communityId)
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(4);
}

function fetchCommunityManagerRows(
  supabase: SupabaseServerClient,
  communityId: string,
  userId: string,
) {
  return supabase
    .from("community_managers")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", userId);
}

async function fetchPostLevelDetails(
  supabase: SupabaseServerClient,
  postIds: string[],
) {
  if (!postIds.length) return emptyPostLevelDetails();

  const [commentsResult, reactionsResult, postMentionsResult] = await Promise.all([
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
  ]);

  if (commentsResult.error) throw commentsResult.error;
  if (reactionsResult.error) throw reactionsResult.error;
  throwUnlessOptionalMentions(postMentionsResult.error);

  return {
    comments: (commentsResult.data ?? []) as CommunityCommentRow[],
    postMentions: readOptionalMentionRows(
      postMentionsResult,
    ) as CommunityPostMentionRow[],
    reactions: (reactionsResult.data ?? []) as CommunityReactionRow[],
  };
}

async function fetchCommentMentions(
  supabase: SupabaseServerClient,
  commentIds: string[],
) {
  const result = commentIds.length
    ? await supabase
        .from("community_mentions")
        .select("comment_id, mentioned_user_id")
        .in("comment_id", commentIds)
    : emptyQueryResult<CommunityCommentMentionRow>();

  throwUnlessOptionalMentions(result.error);
  return readOptionalMentionRows(result) as CommunityCommentMentionRow[];
}

function emptyPostLevelDetails() {
  return {
    comments: [] as CommunityCommentRow[],
    postMentions: [] as CommunityPostMentionRow[],
    reactions: [] as CommunityReactionRow[],
  };
}

function readOptionalMentionRows<T>(result: { data: T[] | null; error: unknown }) {
  return isMissingCommunitySchema(result.error) ? [] : (result.data ?? []);
}

function throwUnlessOptionalMentions(error: unknown) {
  if (error && !isMissingCommunitySchema(error)) throw error;
}

function throwFirstError(
  results: Array<{ error: null | { code?: string; message?: string } }>,
) {
  for (const result of results) {
    if (result.error) throw result.error;
  }
}
