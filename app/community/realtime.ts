"use client";

import { createClient } from "@/utils/supabase/client";

export const communityRealtimeRefreshDelayMs = 250;
export const communityFeedBroadcastEvent = "community-feed-changed";

export function getCommunityFeedChannelName(communityId: string) {
  return `community-feed:${communityId}`;
}

export async function broadcastCommunityFeedChange(communityId: string) {
  const supabase = createClient();
  const channel = supabase.channel(getCommunityFeedChannelName(communityId));

  try {
    await channel.send({
      event: communityFeedBroadcastEvent,
      payload: { communityId },
      type: "broadcast",
    });
  } finally {
    await supabase.removeChannel(channel);
  }
}
