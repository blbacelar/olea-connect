import type {
  CommunitySpace,
  CreatedOrganizationMember,
  CreatedOrganizationOwner,
  DefaultCommunity,
  TestDataManager,
} from "../test-data.fixture";

export async function getDefaultCommunity(this: TestDataManager): Promise<DefaultCommunity> {
  const { data, error } = await this.supabase
    .from("communities")
    .select("id")
    .eq("slug", "olea-connects")
    .single();

  if (error) throw error;
  return data as DefaultCommunity;
}

export async function getCommunitySpace(this: TestDataManager, slug: string): Promise<CommunitySpace> {
  const community = await this.getDefaultCommunity();
  const { data, error } = await this.supabase
    .from("community_spaces")
    .select("id, community_id")
    .eq("community_id", community.id)
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data as CommunitySpace;
}

export async function assignCommunityManager(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  options: {
    role?: "manager" | "moderator";
    spaceSlug?: string;
  } = {},
) {
  const community = await this.getDefaultCommunity();
  const space = options.spaceSlug
    ? await this.getCommunitySpace(options.spaceSlug)
    : null;
  const { data, error } = await this.supabase
    .from("community_managers")
    .insert({
      community_id: community.id,
      space_id: space?.id ?? null,
      user_id: owner.userId,
      role: options.role ?? "manager",
    })
    .select("id")
    .single();

  if (error) throw error;
  const managerId = data.id as string;

  this.registerCleanup({
    label: `community manager ${managerId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("community_managers")
        .delete()
        .eq("id", managerId);
      if (deleteError) throw deleteError;
    },
  });

  return managerId;
}

export async function createCommunityPost(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  options: {
    body: string;
    kind?: "discussion" | "announcement" | "resource";
    pinned?: boolean;
    resourceUrl?: string;
    spaceSlug?: string;
    title: string;
  },
) {
  const space = await this.getCommunitySpace(options.spaceSlug ?? "general");
  const { data, error } = await this.supabase
    .from("community_posts")
    .insert({
      community_id: space.community_id,
      space_id: space.id,
      author_user_id: owner.userId,
      kind: options.kind ?? "discussion",
      status: "published",
      title: options.title,
      body: options.body,
      resource_url: options.resourceUrl,
      pinned_at: options.pinned ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  const postId = data.id as string;

  this.registerCleanup({
    label: `community post ${postId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);
      if (deleteError) throw deleteError;
    },
  });

  return postId;
}

export async function getPendingCommunityPostModerationEventId(this: TestDataManager,
  authorUserId: string,
  title: string,
) {
  const { data: post, error: postError } = await this.supabase
    .from("community_posts")
    .select("id")
    .eq("author_user_id", authorUserId)
    .eq("title", title)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (postError) throw postError;

  const { data: event, error: eventError } = await this.supabase
    .from("integration_events")
    .select("id")
    .eq("provider", "community_moderation")
    .contains("payload", { postId: post.id, targetType: "post" })
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (eventError) throw eventError;

  return event.id as string;
}

export async function createCommunityComment(this: TestDataManager,
  author: CreatedOrganizationOwner | CreatedOrganizationMember,
  options: {
    body: string;
    postId: string;
  },
) {
  const { data, error } = await this.supabase
    .from("community_comments")
    .insert({
      author_user_id: author.userId,
      body: options.body,
      post_id: options.postId,
    })
    .select("id")
    .single();

  if (error) throw error;
  const commentId = data.id as string;

  this.registerCleanup({
    label: `community comment ${commentId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId);
      if (deleteError) throw deleteError;
    },
  });

  return commentId;
}

export async function createCommunityEvent(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  options: {
    endsAt?: string;
    spaceSlug?: string;
    startsAt?: string;
    summary: string;
    timezone?: string;
    title: string;
    zoomUrl?: string;
  },
) {
  const community = await this.getDefaultCommunity();
  const space = options.spaceSlug
    ? await this.getCommunitySpace(options.spaceSlug)
    : null;
  const startsAt =
    options.startsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const endsAt =
    options.endsAt ??
    new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

  const { data, error } = await this.supabase
    .from("community_events")
    .insert({
      community_id: community.id,
      space_id: space?.id ?? null,
      title: options.title,
      summary: options.summary,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: options.timezone ?? "America/Vancouver",
      zoom_url: options.zoomUrl,
      status: "scheduled",
      created_by: owner.userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  const eventId = data.id as string;

  this.registerCleanup({
    label: `community event ${eventId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("community_events")
        .delete()
        .eq("id", eventId);
      if (deleteError) throw deleteError;
    },
  });

  return eventId;
}
