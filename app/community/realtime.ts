"use client";

import { createIsolatedClient, type createClient } from "@/utils/supabase/client";

export const communityRealtimeRefreshDelayMs = 250;
export const communityFeedBroadcastEvent = "community-feed-changed";
const broadcastSubscribeTimeoutMs = 2000;

export function getCommunityFeedChannelName(communityId: string) {
  return `community-feed:${communityId}`;
}

export function createCommunityPostChangesChannel(
  supabase: Pick<ReturnType<typeof createClient>, "channel">,
  communityId: string,
  postIds: string[],
  onChange: () => void,
) {
  // removeChannel waits for the server's leave acknowledgement. A fresh topic
  // prevents the next effect from reusing a channel that has already subscribed.
  const channel = supabase
    .channel(`community-post-changes:${communityId}:${crypto.randomUUID()}`)
    .on("postgres_changes", {
      event: "*",
      filter: `community_id=eq.${communityId}`,
      schema: "public",
      table: "community_posts",
    }, onChange);

  for (const postId of postIds) {
    channel
      .on("postgres_changes", {
        event: "*",
        filter: `post_id=eq.${postId}`,
        schema: "public",
        table: "community_comments",
      }, onChange)
      .on("postgres_changes", {
        event: "*",
        filter: `post_id=eq.${postId}`,
        schema: "public",
        table: "community_reactions",
      }, onChange);
  }

  return channel;
}

export async function broadcastCommunityFeedChange(communityId: string) {
  const supabase = createIsolatedClient();
  const channel = supabase.channel(getCommunityFeedChannelName(communityId));

  try {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, broadcastSubscribeTimeoutMs);

      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;

        window.clearTimeout(timeout);
        resolve();
      });
    });

    await channel.send({
      event: communityFeedBroadcastEvent,
      payload: { communityId },
      type: "broadcast",
    });
  } finally {
    await Promise.allSettled([
      supabase.removeChannel(channel),
      supabase.auth.stopAutoRefresh(),
    ]);
  }
}
