import type {
  CommunityEvent,
  CommunityPost,
  CommunityPostComment,
  CommunitySpace,
  MembershipTier,
} from "@/lib/types";

import { safeHttpsUrl } from "./community-shared";

export type SpaceAccessRuleRow = {
  plan_id: string;
};

export type CommunityRecord = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
};

export type CommunitySpaceRow = {
  community_space_access_rules: SpaceAccessRuleRow[] | null;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type CommunityPostRow = {
  author_user_id: string;
  body: string;
  created_at: string;
  id: string;
  kind: CommunityPost["kind"];
  pinned_at: string | null;
  resource_url: string | null;
  space_id: string;
  title: string;
  updated_at: string;
};

export type CommunityCommentRow = {
  author_user_id: string;
  body: string;
  created_at: string;
  id: string;
  post_id: string;
  updated_at: string;
};

export type CommunityReactionRow = {
  comment_id: string | null;
  kind: string;
  post_id: string;
  user_id: string;
};

export type CommunityPostMentionRow = {
  mentioned_user_id: string;
  post_id: string | null;
};

export type CommunityCommentMentionRow = {
  comment_id: string | null;
  mentioned_user_id: string;
};

export type CommunityEventRow = {
  ends_at: string;
  id: string;
  recording_url: string | null;
  space_id: string | null;
  starts_at: string;
  status: CommunityEvent["status"];
  summary: string;
  timezone: string;
  title: string;
  zoom_url: string | null;
};

export type AuthorAttribution = {
  name: string;
  organizationName: string;
};

type MappedReaction = {
  kind: string;
  user_id: string;
};

type MapPostInput = {
  authorsByUserId: Map<string, AuthorAttribution>;
  comments: CommunityPostComment[];
  currentUserId: string;
  mentionedUserIds: string[];
  reactions: MappedReaction[];
  row: CommunityPostRow;
};

type MapCommentInput = {
  authorsByUserId: Map<string, AuthorAttribution>;
  currentUserId: string;
  mentionedUserIds: string[];
  reactions: MappedReaction[];
  row: CommunityCommentRow;
};

export function mapSpace(row: CommunitySpaceRow): CommunitySpace {
  return {
    allowedPlanIds: (row.community_space_access_rules ?? []).map(
      (rule) => rule.plan_id as MembershipTier,
    ),
    description: row.description,
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
  };
}

export function mapEvent(row: CommunityEventRow): CommunityEvent {
  return {
    endsAt: row.ends_at,
    id: row.id,
    recordingUrl: safeHttpsUrl(row.recording_url),
    spaceId: row.space_id,
    startsAt: row.starts_at,
    status: row.status,
    summary: row.summary,
    timezone: row.timezone,
    title: row.title,
    zoomUrl: safeHttpsUrl(row.zoom_url),
  };
}

export function mapPost(input: MapPostInput): CommunityPost {
  const { authorsByUserId, comments, currentUserId, mentionedUserIds, reactions, row } =
    input;
  const author = authorsByUserId.get(row.author_user_id);

  return {
    authorName: author?.name ?? "Member",
    authorOrganizationName: author?.organizationName ?? "Member organization",
    authorUserId: row.author_user_id,
    body: row.body,
    comments,
    createdAt: row.created_at,
    id: row.id,
    kind: row.kind,
    likeCount: reactions.filter(isHelpfulReaction).length,
    likedByCurrentUser: reactions.some((reaction) =>
      isHelpfulReactionFromUser(reaction, currentUserId),
    ),
    mentionedUserIds,
    pinnedAt: row.pinned_at,
    resourceUrl: safeHttpsUrl(row.resource_url),
    spaceId: row.space_id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function mapComment(input: MapCommentInput): CommunityPostComment {
  const { authorsByUserId, currentUserId, mentionedUserIds, reactions, row } = input;
  const author = authorsByUserId.get(row.author_user_id);

  return {
    authorName: author?.name ?? "Member",
    authorOrganizationName: author?.organizationName ?? "Member organization",
    authorUserId: row.author_user_id,
    body: row.body,
    createdAt: row.created_at,
    id: row.id,
    likeCount: reactions.filter(isHelpfulReaction).length,
    likedByCurrentUser: reactions.some((reaction) =>
      isHelpfulReactionFromUser(reaction, currentUserId),
    ),
    mentionedUserIds,
    updatedAt: row.updated_at,
  };
}

function isHelpfulReaction(reaction: MappedReaction) {
  return reaction.kind === "helpful";
}

function isHelpfulReactionFromUser(reaction: MappedReaction, userId: string) {
  return isHelpfulReaction(reaction) && reaction.user_id === userId;
}
