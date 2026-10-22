"use server";

import {
  getActionErrorMessage,
  getRequiredMemberContext,
  getServerClient,
  getText,
  validateCommentId,
  validatePostId,
  type CommunityActionState,
} from "./community-action-support";

export async function toggleCommunityCommentLike(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await getRequiredMemberContext();
    const commentId = validateCommentId(formData);
    const intent = getText(formData, "intent");
    const supabase = await getServerClient();

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
    const { member } = await getRequiredMemberContext();
    const intent = getText(formData, "intent");
    const postId = validatePostId(formData);
    const supabase = await getServerClient();

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
