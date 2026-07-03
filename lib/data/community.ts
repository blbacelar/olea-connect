import "server-only";

import { redirect } from "next/navigation";

import type {
  CommunityEvent,
  CommunityHome,
  CommunityPost,
  CommunitySpace,
  MembershipTier,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

type SpaceAccessRuleRow = {
  plan_id: string;
};

type CommunitySpaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  community_space_access_rules: SpaceAccessRuleRow[] | null;
};

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mapSpace(row: CommunitySpaceRow): CommunitySpace {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    allowedPlanIds: (row.community_space_access_rules ?? []).map(
      (rule) => rule.plan_id as MembershipTier,
    ),
  };
}

function mapPost(row: {
  id: string;
  space_id: string;
  kind: CommunityPost["kind"];
  title: string;
  body: string;
  resource_url: string | null;
  pinned_at: string | null;
  created_at: string;
}): CommunityPost {
  return {
    id: row.id,
    spaceId: row.space_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    resourceUrl: safeHttpsUrl(row.resource_url),
    pinnedAt: row.pinned_at,
    createdAt: row.created_at,
  };
}

function mapEvent(row: {
  id: string;
  space_id: string | null;
  title: string;
  summary: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  zoom_url: string | null;
  recording_url: string | null;
  status: CommunityEvent["status"];
}): CommunityEvent {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    summary: row.summary,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    zoomUrl: safeHttpsUrl(row.zoom_url),
    recordingUrl: safeHttpsUrl(row.recording_url),
    status: row.status,
  };
}

export async function getCommunityHome(): Promise<CommunityHome | null> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription?.status ?? "")) {
    redirect("/subscription?billing=required");
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, slug, name, description")
    .eq("slug", "olea-connects")
    .maybeSingle();

  if (communityError) throw communityError;
  if (!community) return null;

  const [
    { data: spaces, error: spacesError },
    { data: posts, error: postsError },
    { data: events, error: eventsError },
    { data: managerRows, error: managerError },
  ] = await Promise.all([
    supabase
      .from("community_spaces")
      .select(
        "id, slug, name, description, sort_order, community_space_access_rules(plan_id)",
      )
      .eq("community_id", community.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("community_posts")
      .select(
        "id, space_id, kind, title, body, resource_url, pinned_at, created_at",
      )
      .eq("community_id", community.id)
      .eq("status", "published")
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("community_events")
      .select(
        "id, space_id, title, summary, starts_at, ends_at, timezone, zoom_url, recording_url, status",
      )
      .eq("community_id", community.id)
      .in("status", ["scheduled", "live"])
      .order("starts_at", { ascending: true })
      .limit(4),
    supabase
      .from("community_managers")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", member.id),
  ]);

  if (spacesError) throw spacesError;
  if (postsError) throw postsError;
  if (eventsError) throw eventsError;
  if (managerError) throw managerError;

  return {
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    spaces: ((spaces ?? []) as CommunitySpaceRow[]).map(mapSpace),
    posts: (posts ?? []).map(mapPost),
    events: (events ?? []).map(mapEvent),
    canManage: Boolean(managerRows?.length),
  };
}
