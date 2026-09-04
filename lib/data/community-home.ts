import type { CommunityHome } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { getAuthorsByUserId } from "./community-authors";
import { buildCommunityCollections } from "./community-collections";
import { getMentionCandidates } from "./community-mentions";
import { mapEvent, mapPost, mapSpace } from "./community-mappers";
import {
  ensureActiveCommunitySubscription,
  fetchCommunityRecord,
  fetchCoreCommunityData,
  fetchPostDetails,
} from "./community-queries";
import { requireMemberContext } from "./member-context";

export async function getCommunityHome(): Promise<CommunityHome | null> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();

  await ensureActiveCommunitySubscription(supabase, organization.id);

  const community = await fetchCommunityRecord(supabase);
  if (!community) return null;

  const coreData = await fetchCoreCommunityData(supabase, community.id, member.id);
  if (!coreData) return null;

  const postDetails = await fetchPostDetails(
    supabase,
    coreData.posts.map((post) => post.id),
  );
  const authorsByUserId = await getAuthorsByUserId(
    coreData.posts,
    postDetails.comments,
  );
  const mentionCandidates = await getMentionCandidates(member.id);
  const collections = buildCommunityCollections({
    authorsByUserId,
    commentMentions: postDetails.commentMentions,
    comments: postDetails.comments,
    currentUserId: member.id,
    postMentions: postDetails.postMentions,
    reactions: postDetails.reactions,
  });

  return {
    canManage: coreData.canManage,
    currentUserId: member.id,
    description: community.description,
    events: coreData.events.map(mapEvent),
    id: community.id,
    mentionCandidates,
    name: community.name,
    posts: coreData.posts.map((post) =>
      mapPost({
        authorsByUserId,
        comments: collections.commentsByPostId.get(post.id) ?? [],
        currentUserId: member.id,
        mentionedUserIds: collections.mentionedUserIdsByPostId.get(post.id) ?? [],
        reactions: collections.reactionsByPostId.get(post.id) ?? [],
        row: post,
      }),
    ),
    slug: community.slug,
    spaces: coreData.spaces.map(mapSpace),
  };
}
