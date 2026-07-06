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

export async function updateCommunityPost(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const input = validateCommunityPostUpdateInput(formData);
    const supabase = await createClient();

    const { error } = await supabase
      .from("community_posts")
      .update({
        body: input.body,
        resource_url: input.resourceUrl,
        title: input.title,
      })
      .eq("id", input.postId)
      .select("id")
      .single();

    if (error) throw error;
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
    const input = validateCommentUpdateInput(formData);
    const supabase = await createClient();

    const { error } = await supabase
      .from("community_comments")
      .update({ body: input.body })
      .eq("id", input.commentId)
      .select("id")
      .single();

    if (error) throw error;
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
