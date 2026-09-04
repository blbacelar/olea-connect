"use server";

import {
  getActionErrorMessage,
  getRequiredMemberContext,
  getServerClient,
  queueCommunityModeration,
  validateCommentId,
  validateCommentInput,
  validateCommentUpdateInput,
  type CommunityActionState,
} from "./community-action-support";
import {
  getMentionedUserIds,
  syncCommunityMentions,
} from "./community-mention-support";

export async function createCommunityComment(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member, organization } = await getRequiredMemberContext();
    const input = validateCommentInput(formData);
    const supabase = await getServerClient();
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
      .select("id, body, created_at")
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
      createdComment: comment?.id
        ? {
            authorName: member.name,
            authorOrganizationName: organization.name,
            authorUserId: member.id,
            body: comment.body,
            createdAt: comment.created_at,
            id: comment.id,
            mentionedUserIds: getMentionedUserIds(formData, member.id),
          }
        : undefined,
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
    const { member } = await getRequiredMemberContext();
    const input = validateCommentUpdateInput(formData);
    const supabase = await getServerClient();
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
    await getRequiredMemberContext();
    const commentId = validateCommentId(formData);
    const supabase = await getServerClient();
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
