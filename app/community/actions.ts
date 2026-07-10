"use server";

import { requireMemberContext } from "@/lib/data/member-context";
import type { CommunityPost } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type CreateCommunityPostState = {
  message: string;
  status: "error" | "idle" | "success";
};

export type CommunityActionState = CreateCommunityPostState;

const postKinds = ["discussion", "announcement", "resource"] as const;
const communityModerationProvider = "community_moderation";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function validateKind(value: string): CommunityPost["kind"] {
  if (postKinds.includes(value as CommunityPost["kind"])) {
    return value as CommunityPost["kind"];
  }

  throw new Error("Choose a supported post type.");
}

async function queueCommunityModeration(
  target:
    | {
        postId: string;
        targetType: "post";
      }
    | {
        commentId: string;
        targetType: "comment";
      },
) {
  try {
    const admin = createAdminClient();
    const aggregateType =
      target.targetType === "post" ? "community_post" : "community_comment";
    const aggregateId =
      target.targetType === "post" ? target.postId : target.commentId;

    const { error } = await admin.from("integration_events").insert({
      aggregate_id: aggregateId,
      aggregate_type: aggregateType,
      event_type: `community.${target.targetType}.moderation_requested`,
      payload: target,
      provider: communityModerationProvider,
    });

    if (error) {
      console.error("Unable to queue community moderation", error);
      return;
    }

    triggerCommunityModerationWorker();
  } catch (error) {
    console.error("Unable to queue community moderation", error);
  }
}

function triggerCommunityModerationWorker() {
  const secret = process.env.CRON_SECRET;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!secret || !appUrl) return;

  try {
    void fetch(`${appUrl}/api/v1/community/moderation/process`, {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${secret}`,
      },
      method: "GET",
    }).catch((error) => {
      console.error("Unable to trigger community moderation worker", error);
    });
  } catch (error) {
    console.error("Unable to trigger community moderation worker", error);
  }
}

function normalizeResourceUrl(value: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("Only secure HTTPS resource links are supported.");
    }
    return url.toString();
  } catch {
    throw new Error("Enter a valid HTTPS resource link.");
  }
}

function getMentionedUserIds(formData: FormData, currentUserId: string) {
  return Array.from(
    new Set(
      formData
        .getAll("mentionedUserIds")
        .map((value) => String(value).trim())
        .filter((value) => uuidPattern.test(value) && value !== currentUserId),
    ),
  );
}

async function filterMentionedUsersForSpace(
  spaceId: string,
  mentionedUserIds: string[],
) {
  if (!mentionedUserIds.length) return [];

  const admin = createAdminClient();
  const [
    { data: space, error: spaceError },
    { data: memberships, error: membershipsError },
  ] = await Promise.all([
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
  if (membershipsError) throw membershipsError;
  if (!space || space.status !== "active") return [];

  const community = Array.isArray(space.communities)
    ? space.communities[0]
    : space.communities;
  if (community?.status !== "active") return [];

  const organizationIds = Array.from(
    new Set((memberships ?? []).map((membership) => membership.organization_id)),
  );
  if (!organizationIds.length) return [];

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("organization_id, plan_id")
    .in("organization_id", organizationIds)
    .in("status", ["active", "trialing"]);

  if (subscriptionsError) throw subscriptionsError;

  const allowedPlanIds = new Set(
    (space.community_space_access_rules ?? []).map((rule) => rule.plan_id),
  );
  const subscriptionsByOrganizationId = new Map<string, string[]>();
  for (const subscription of subscriptions ?? []) {
    const plans =
      subscriptionsByOrganizationId.get(subscription.organization_id) ?? [];
    plans.push(subscription.plan_id);
    subscriptionsByOrganizationId.set(subscription.organization_id, plans);
  }

  const validUserIds = new Set<string>();
  for (const membership of memberships ?? []) {
    const plans = subscriptionsByOrganizationId.get(membership.organization_id);
    if (!plans?.length) continue;

    const hasAccess =
      allowedPlanIds.size === 0 ||
      plans.some((planId) => allowedPlanIds.has(planId));
    if (hasAccess) validUserIds.add(membership.user_id);
  }

  return mentionedUserIds.filter((userId) => validUserIds.has(userId));
}

async function syncCommunityMentions({
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

  if (insertError) throw insertError;
}

function validatePostInput(formData: FormData) {
  const body = getText(formData, "body");
  const kind = validateKind(getText(formData, "kind") || "discussion");
  const resourceUrl = normalizeResourceUrl(getText(formData, "resourceUrl"));
  const spaceId = getText(formData, "spaceId");
  const title = getText(formData, "title");

  if (!spaceId) throw new Error("Choose a community space.");
  if (title.length < 3 || title.length > 180) {
    throw new Error("Use a title between 3 and 180 characters.");
  }
  if (body.length < 10 || body.length > 12000) {
    throw new Error("Use a post body between 10 and 12,000 characters.");
  }

  return {
    body,
    kind,
    resourceUrl,
    spaceId,
    title,
  };
}

export async function createCommunityPost(
  _previousState: CreateCommunityPostState,
  formData: FormData,
): Promise<CreateCommunityPostState> {
  try {
    const { member } = await requireMemberContext();
    const input = validatePostInput(formData);
    const supabase = await createClient();

    const { data: space, error: spaceError } = await supabase
      .from("community_spaces")
      .select("id, community_id")
      .eq("id", input.spaceId)
      .single();

    if (spaceError) throw spaceError;

    const { data: post, error } = await supabase
      .from("community_posts")
      .insert({
        author_user_id: member.id,
        body: input.body,
        community_id: space.community_id,
        kind: input.kind,
        resource_url: input.resourceUrl,
        space_id: space.id,
        status: "published",
        title: input.title,
      })
      .select("id")
      .single();

    if (error) throw error;
    if (post?.id) {
      await syncCommunityMentions({
        actorUserId: member.id,
        formData,
        target: {
          communityId: space.community_id,
          postId: post.id,
          spaceId: space.id,
          targetType: "post",
        },
      });
    }
    if (post?.id) await queueCommunityModeration({ postId: post.id, targetType: "post" });

    return {
      message: "Your post is live. Safety checks continue in the background.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not publish your post. Please try again.",
      ),
      status: "error",
    };
  }
}

function validatePostId(formData: FormData) {
  const postId = getText(formData, "postId");
  if (!postId) throw new Error("Choose a post.");
  return postId;
}

function validateCommunityPostUpdateInput(formData: FormData) {
  const body = getText(formData, "body");
  const postId = validatePostId(formData);
  const resourceUrl = normalizeResourceUrl(getText(formData, "resourceUrl"));
  const title = getText(formData, "title");

  if (title.length < 3 || title.length > 180) {
    throw new Error("Use a title between 3 and 180 characters.");
  }
  if (body.length < 10 || body.length > 12000) {
    throw new Error("Use a post body between 10 and 12,000 characters.");
  }

  return {
    body,
    postId,
    resourceUrl,
    title,
  };
}

function validateCommentInput(formData: FormData) {
  const body = getText(formData, "body");
  const postId = validatePostId(formData);

  if (body.length < 2 || body.length > 6000) {
    throw new Error("Use a comment between 2 and 6,000 characters.");
  }

  return { body, postId };
}

function validateCommentUpdateInput(formData: FormData) {
  const body = getText(formData, "body");
  const commentId = getText(formData, "commentId");

  if (!commentId) throw new Error("Choose a comment.");
  if (body.length < 2 || body.length > 6000) {
    throw new Error("Use a comment between 2 and 6,000 characters.");
  }

  return { body, commentId };
}

function validateCommentId(formData: FormData) {
  const commentId = getText(formData, "commentId");
  if (!commentId) throw new Error("Choose a comment.");
  return commentId;
}

export async function updateCommunityPost(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await requireMemberContext();
    const input = validateCommunityPostUpdateInput(formData);
    const supabase = await createClient();

    const { data: post, error } = await supabase
      .from("community_posts")
      .update({
        body: input.body,
        resource_url: input.resourceUrl,
        title: input.title,
      })
      .eq("id", input.postId)
      .select("id, community_id, space_id")
      .single();

    if (error) throw error;
    await syncCommunityMentions({
      actorUserId: member.id,
      formData,
      target: {
        communityId: post.community_id,
        postId: post.id,
        spaceId: post.space_id,
        targetType: "post",
      },
    });
    await queueCommunityModeration({ postId: input.postId, targetType: "post" });

    return {
      message: "Post updated. Safety checks continue in the background.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not update your post. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function deleteCommunityPost(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await requireMemberContext();
    const postId = validatePostId(formData);
    const supabase = await createClient();

    const { error } = await supabase
      .from("community_posts")
      .update({
        hidden_at: new Date().toISOString(),
        hidden_by: member.id,
        status: "archived",
      })
      .eq("id", postId)
      .select("id")
      .single();

    if (error) throw error;

    return {
      message: "Post deleted.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not delete your post. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function createCommunityComment(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await requireMemberContext();
    const input = validateCommentInput(formData);
    const supabase = await createClient();
    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, community_id, space_id")
      .eq("id", input.postId)
      .eq("status", "published")
      .is("hidden_at", null)
      .single();

    if (postError) throw postError;

    const { data: comment, error } = await supabase
      .from("community_comments")
      .insert({
        author_user_id: member.id,
        body: input.body,
        post_id: input.postId,
      })
      .select("id")
      .single();

    if (error) throw error;
    if (comment?.id) {
      await syncCommunityMentions({
        actorUserId: member.id,
        formData,
        target: {
          commentId: comment.id,
          communityId: post.community_id,
          spaceId: post.space_id,
          targetType: "comment",
        },
      });
      await queueCommunityModeration({
        commentId: comment.id,
        targetType: "comment",
      });
    }

    return {
      message: "Your comment was added. Safety checks continue in the background.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not add your comment. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function updateCommunityComment(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await requireMemberContext();
    const input = validateCommentUpdateInput(formData);
    const supabase = await createClient();

    const { data: comment, error } = await supabase
      .from("community_comments")
      .update({ body: input.body })
      .eq("id", input.commentId)
      .select("id, post_id")
      .single();

    if (error) throw error;
    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, community_id, space_id")
      .eq("id", comment.post_id)
      .single();

    if (postError) throw postError;

    await syncCommunityMentions({
      actorUserId: member.id,
      formData,
      target: {
        commentId: comment.id,
        communityId: post.community_id,
        spaceId: post.space_id,
        targetType: "comment",
      },
    });
    await queueCommunityModeration({
      commentId: input.commentId,
      targetType: "comment",
    });

    return {
      message: "Comment updated. Safety checks continue in the background.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not update your comment. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function deleteCommunityComment(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    await requireMemberContext();
    const commentId = getText(formData, "commentId");
    if (!commentId) throw new Error("Choose a comment.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId)
      .select("id")
      .single();

    if (error) throw error;

    return {
      message: "Comment deleted.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not delete your comment. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function toggleCommunityCommentLike(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await requireMemberContext();
    const commentId = validateCommentId(formData);
    const intent = getText(formData, "intent");
    const supabase = await createClient();

    if (intent === "unlike") {
      const { error } = await supabase
        .from("community_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", member.id)
        .eq("kind", "helpful");

      if (error) throw error;

      return {
        message: "Like removed.",
        status: "success",
      };
    }

    const { data: comment, error: commentError } = await supabase
      .from("community_comments")
      .select("post_id")
      .eq("id", commentId)
      .is("hidden_at", null)
      .single();

    if (commentError) throw commentError;

    const { error } = await supabase.from("community_reactions").insert({
      comment_id: commentId,
      kind: "helpful",
      post_id: comment.post_id,
      user_id: member.id,
    });

    if (error && error.code !== "23505") throw error;

    return {
      message: "Comment liked.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not update your comment like. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function toggleCommunityPostLike(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await requireMemberContext();
    const intent = getText(formData, "intent");
    const postId = validatePostId(formData);
    const supabase = await createClient();

    if (intent === "unlike") {
      const { error } = await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .is("comment_id", null)
        .eq("user_id", member.id)
        .eq("kind", "helpful");

      if (error) throw error;

      return {
        message: "Like removed.",
        status: "success",
      };
    }

    const { error } = await supabase.from("community_reactions").insert({
      kind: "helpful",
      post_id: postId,
      user_id: member.id,
    });

    if (error && error.code !== "23505") throw error;

    return {
      message: "Post liked.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "We could not update your like. Please try again.",
      ),
      status: "error",
    };
  }
}
