import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { moderateCommunityPost } from "@/lib/community/moderation";
import {
  completeIntegrationEvent,
  type IntegrationEvent,
} from "@/lib/integrations/outbox";

type CommunityModerationPayload =
  | {
      postId: string;
      targetType: "post";
    }
  | {
      commentId: string;
      targetType: "comment";
    };

function isCommunityModerationPayload(
  payload: unknown,
): payload is CommunityModerationPayload {
  if (!payload || typeof payload !== "object" || !("targetType" in payload)) {
    return false;
  }

  if (payload.targetType === "post") {
    return "postId" in payload && typeof payload.postId === "string";
  }

  if (payload.targetType === "comment") {
    return "commentId" in payload && typeof payload.commentId === "string";
  }

  return false;
}

async function hidePost(supabase: SupabaseClient, postId: string) {
  const { error } = await supabase
    .from("community_posts")
    .update({
      hidden_at: new Date().toISOString(),
      status: "hidden",
    })
    .eq("id", postId);

  if (error) throw error;
}

async function hideComment(supabase: SupabaseClient, commentId: string) {
  const { error } = await supabase
    .from("community_comments")
    .update({
      hidden_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) throw error;
}

async function processPostModeration(
  supabase: SupabaseClient,
  postId: string,
) {
  const { data: post, error } = await supabase
    .from("community_posts")
    .select("id, title, body, resource_url, status, hidden_at")
    .eq("id", postId)
    .single();

  if (error) throw error;
  if (!post || post.status !== "published" || post.hidden_at) return;

  const moderation = await moderateCommunityPost({
    body: post.body,
    resourceUrl: post.resource_url,
    title: post.title,
  });

  if (!moderation.approved) {
    await hidePost(supabase, post.id);
  }
}

async function processCommentModeration(
  supabase: SupabaseClient,
  commentId: string,
) {
  const { data: comment, error } = await supabase
    .from("community_comments")
    .select(
      "id, body, hidden_at, community_posts!inner(id, title, status, hidden_at)",
    )
    .eq("id", commentId)
    .single();

  if (error) throw error;
  if (!comment || comment.hidden_at) return;

  const post = Array.isArray(comment.community_posts)
    ? comment.community_posts[0]
    : comment.community_posts;

  if (!post || post.status !== "published" || post.hidden_at) return;

  const moderation = await moderateCommunityPost({
    body: comment.body,
    title: `Comment on ${post.title}`,
  });

  if (!moderation.approved) {
    await hideComment(supabase, comment.id);
  }
}

export async function processCommunityModerationEvent(
  supabase: SupabaseClient,
  event: IntegrationEvent<unknown>,
) {
  if (!isCommunityModerationPayload(event.payload)) {
    throw new Error("Invalid community moderation event payload.");
  }

  if (event.payload.targetType === "post") {
    await processPostModeration(supabase, event.payload.postId);
  } else {
    await processCommentModeration(supabase, event.payload.commentId);
  }

  await completeIntegrationEvent(supabase, event.id);
}
