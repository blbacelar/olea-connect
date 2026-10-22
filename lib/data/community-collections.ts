import type { CommunityPostComment } from "@/lib/types";

import {
  type AuthorAttribution,
  type CommunityCommentMentionRow,
  type CommunityCommentRow,
  type CommunityPostMentionRow,
  type CommunityReactionRow,
  mapComment,
} from "./community-mappers";

type MappedReaction = {
  kind: string;
  user_id: string;
};

type CommunityCollectionsInput = {
  authorsByUserId: Map<string, AuthorAttribution>;
  commentMentions: CommunityCommentMentionRow[];
  comments: CommunityCommentRow[];
  currentUserId: string;
  postMentions: CommunityPostMentionRow[];
  reactions: CommunityReactionRow[];
};

type CommunityCollections = {
  commentsByPostId: Map<string, CommunityPostComment[]>;
  mentionedUserIdsByPostId: Map<string, string[]>;
  reactionsByPostId: Map<string, MappedReaction[]>;
};

export function buildCommunityCollections({
  authorsByUserId,
  commentMentions,
  comments,
  currentUserId,
  postMentions,
  reactions,
}: CommunityCollectionsInput): CommunityCollections {
  const groupedReactions = groupReactions(reactions);
  const mentionedUserIdsByCommentId = groupMentionedUsersById(
    commentMentions,
    "comment_id",
  );

  return {
    commentsByPostId: mapCommentsByPostId({
      authorsByUserId,
      comments,
      currentUserId,
      mentionedUserIdsByCommentId,
      reactionsByCommentId: groupedReactions.byCommentId,
    }),
    mentionedUserIdsByPostId: groupMentionedUsersById(postMentions, "post_id"),
    reactionsByPostId: groupedReactions.byPostId,
  };
}

function groupReactions(reactions: CommunityReactionRow[]) {
  const byPostId = new Map<string, MappedReaction[]>();
  const byCommentId = new Map<string, MappedReaction[]>();

  for (const reaction of reactions) {
    const mappedReaction = { kind: reaction.kind, user_id: reaction.user_id };
    if (reaction.comment_id) {
      appendToMap(byCommentId, reaction.comment_id, mappedReaction);
    } else {
      appendToMap(byPostId, reaction.post_id, mappedReaction);
    }
  }

  return { byCommentId, byPostId };
}

function groupMentionedUsersById<
  Row extends { mentioned_user_id: string },
  Key extends keyof Row,
>(mentions: Row[], idKey: Key): Map<string, string[]> {
  const mentionedUserIdsById = new Map<string, string[]>();

  for (const mention of mentions) {
    const id = mention[idKey];
    if (typeof id === "string") {
      appendToMap(mentionedUserIdsById, id, mention.mentioned_user_id);
    }
  }

  return mentionedUserIdsById;
}

type MapCommentsInput = {
  authorsByUserId: Map<string, AuthorAttribution>;
  comments: CommunityCommentRow[];
  currentUserId: string;
  mentionedUserIdsByCommentId: Map<string, string[]>;
  reactionsByCommentId: Map<string, MappedReaction[]>;
};

function mapCommentsByPostId(input: MapCommentsInput) {
  const commentsByPostId = new Map<string, CommunityPostComment[]>();

  for (const comment of input.comments) {
    appendToMap(
      commentsByPostId,
      comment.post_id,
      mapComment({
        authorsByUserId: input.authorsByUserId,
        currentUserId: input.currentUserId,
        mentionedUserIds: input.mentionedUserIdsByCommentId.get(comment.id) ?? [],
        reactions: input.reactionsByCommentId.get(comment.id) ?? [],
        row: comment,
      }),
    );
  }

  return commentsByPostId;
}

function appendToMap<Value>(map: Map<string, Value[]>, key: string, value: Value) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}
