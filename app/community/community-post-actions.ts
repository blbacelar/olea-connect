"use server";

import {
  getActionErrorMessage,
  getRequiredMemberContext,
  getServerClient,
  queueCommunityModeration,
  validateCommunityPostUpdateInput,
  validatePostId,
  validatePostInput,
  type CommunityActionState,
  type CreateCommunityPostState,
} from "./community-action-support";
import {
  getMentionedUserIds,
  syncCommunityMentions,
} from "./community-mention-support";

export async function createCommunityPost(
  _previousState: CreateCommunityPostState,
  formData: FormData,
): Promise<CreateCommunityPostState> {
  try {
    const { member } = await getRequiredMemberContext();
    const input = validatePostInput(formData);
    const mentionedUserIds = getMentionedUserIds(formData, member.id);
    const supabase = await getServerClient();
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
        rawMentionedUserIds: mentionedUserIds,
        target: {
          communityId: space.community_id,
          postId: post.id,
          spaceId: space.id,
          targetType: "post",
        },
      });
      await queueCommunityModeration({ postId: post.id, targetType: "post" });
    }

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

export async function updateCommunityPost(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  try {
    const { member } = await getRequiredMemberContext();
    const input = validateCommunityPostUpdateInput(formData);
    const mentionedUserIds = getMentionedUserIds(formData, member.id);
    const supabase = await getServerClient();
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
      rawMentionedUserIds: mentionedUserIds,
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
    const { member } = await getRequiredMemberContext();
    const postId = validatePostId(formData);
    const supabase = await getServerClient();
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
