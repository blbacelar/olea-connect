import { createAdminClient } from "@/utils/supabase/admin";

import type {
  AuthorAttribution,
  CommunityCommentRow,
  CommunityPostRow,
} from "./community-mappers";

type ProfileRow = {
  full_name: string | null;
  id: string;
};

type OrganizationMembershipRow = {
  organizations: { name: string | null } | Array<{ name: string | null }> | null;
  user_id: string;
};

export async function getAuthorsByUserId(
  posts: CommunityPostRow[],
  comments: CommunityCommentRow[],
): Promise<Map<string, AuthorAttribution>> {
  const authorUserIds = collectAuthorUserIds(posts, comments);
  if (!authorUserIds.length) return new Map();

  const admin = createAdminClient();
  const [profilesResult, membershipsResult] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", authorUserIds),
    admin
      .from("organization_members")
      .select("user_id, organizations(name)")
      .in("user_id", authorUserIds)
      .eq("status", "active"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const authorsByUserId = mapProfileAuthors(profilesResult.data ?? []);
  applyOrganizationNames(authorsByUserId, membershipsResult.data ?? []);
  return authorsByUserId;
}

function collectAuthorUserIds(
  posts: CommunityPostRow[],
  comments: CommunityCommentRow[],
) {
  const authorUserIds = new Set<string>();
  for (const post of posts) authorUserIds.add(post.author_user_id);
  for (const comment of comments) authorUserIds.add(comment.author_user_id);
  return Array.from(authorUserIds);
}

function mapProfileAuthors(profiles: ProfileRow[]) {
  const authorsByUserId = new Map<string, AuthorAttribution>();

  for (const profile of profiles) {
    const name = profile.full_name?.trim();
    if (name) {
      authorsByUserId.set(profile.id, {
        name,
        organizationName: "Member organization",
      });
    }
  }

  return authorsByUserId;
}

function applyOrganizationNames(
  authorsByUserId: Map<string, AuthorAttribution>,
  memberships: OrganizationMembershipRow[],
) {
  for (const membership of memberships) {
    const organizationName = getOrganizationName(membership.organizations);
    if (!organizationName) continue;

    const existing = authorsByUserId.get(membership.user_id);
    authorsByUserId.set(membership.user_id, {
      name: existing?.name ?? "Member",
      organizationName,
    });
  }
}

function getOrganizationName(
  organizations: OrganizationMembershipRow["organizations"],
) {
  const organization = Array.isArray(organizations) ? organizations[0] : organizations;
  return organization?.name?.trim();
}
