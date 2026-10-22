import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createIsolatedClient = vi.hoisted(() => vi.fn());

vi.mock("@/utils/supabase/client", () => ({
  createIsolatedClient,
}));

import {
  broadcastCommunityFeedChange,
  createCommunityPostChangesChannel,
} from "@/app/community/realtime";

describe("community realtime channels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a fresh postgres channel when post IDs change before the old channel is removed", () => {
    const channels = new Map<string, {
      bindings: Array<{ table: string; filter?: string }>;
      on: (type: string, filter: { table: string; filter?: string }) => unknown;
      subscribe: () => void;
      subscribed: boolean;
    }>();
    const client = {
      channel(topic: string) {
        const existing = channels.get(topic);
        if (existing) return existing;
        const channel = {
          bindings: [] as Array<{ table: string; filter?: string }>,
          subscribed: false,
          on(_type: string, filter: { table: string; filter?: string }) {
            if (this.subscribed) throw new Error("cannot add callbacks after subscribe");
            this.bindings.push(filter);
            return this;
          },
          subscribe() {
            this.subscribed = true;
          },
        };
        channels.set(topic, channel);
        return channel;
      },
    } as unknown as Parameters<typeof createCommunityPostChangesChannel>[0];

    const first = createCommunityPostChangesChannel(client, "community-1", ["post-1"], vi.fn());
    first.subscribe();
    const second = createCommunityPostChangesChannel(client, "community-1", ["post-1", "post-2"], vi.fn());
    second.subscribe();

    expect(channels.size).toBe(2);
    expect([...channels.keys()]).toEqual([
      expect.stringMatching(/^community-post-changes:community-1:/),
      expect.stringMatching(/^community-post-changes:community-1:/),
    ]);
    expect(first).not.toBe(second);
    expect(channels.get([...channels.keys()][1])?.bindings).toEqual([
      expect.objectContaining({ table: "community_posts", filter: "community_id=eq.community-1" }),
      expect.objectContaining({ table: "community_comments", filter: "post_id=eq.post-1" }),
      expect.objectContaining({ table: "community_reactions", filter: "post_id=eq.post-1" }),
      expect.objectContaining({ table: "community_comments", filter: "post_id=eq.post-2" }),
      expect.objectContaining({ table: "community_reactions", filter: "post_id=eq.post-2" }),
    ]);
  });

  it("sends broadcasts through a separate client and removes only that channel", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const channel = {
      subscribe(callback: (status: string) => void) {
        callback("SUBSCRIBED");
      },
      send: vi.fn().mockResolvedValue("ok"),
    };
    const removeChannel = vi.fn().mockResolvedValue("ok");
    const stopAutoRefresh = vi.fn().mockResolvedValue(undefined);
    createIsolatedClient.mockReturnValue({
      auth: { stopAutoRefresh },
      channel: vi.fn().mockReturnValue(channel),
      removeChannel,
    });

    await broadcastCommunityFeedChange("community-1");

    expect(createIsolatedClient).toHaveBeenCalledOnce();
    expect(channel.send).toHaveBeenCalledWith({
      event: "community-feed-changed",
      payload: { communityId: "community-1" },
      type: "broadcast",
    });
    expect(removeChannel).toHaveBeenCalledExactlyOnceWith(channel);
    expect(stopAutoRefresh).toHaveBeenCalledOnce();
  });
});
