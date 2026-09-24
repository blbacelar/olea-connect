import "server-only";

import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";

const PAGE_SIZE = 50;
const ROW_PAGE_SIZE = 500;

export type DirectoryUser = {
  id: string;
  name: string;
  email: string | null;
  confirmed: boolean | null;
  createdAt: string | null;
  organizations: string[];
  isSponsor: boolean;
  sponsorNames: string[];
};

export type UserDirectoryData = {
  canViewPrivateDetails: boolean;
  users: DirectoryUser[];
  page: number;
  lastPage: number;
  total: number;
};

export function parseUserDirectoryPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^[1-9]\d{0,4}$/.test(raw)) return 1;
  return Number(raw);
}

function addSponsorName(
  namesByEmail: Map<string, Set<string>>,
  email: string | null,
  name: string,
) {
  if (!email) return;
  const key = email.trim().toLowerCase();
  if (!key) return;
  const names = namesByEmail.get(key) ?? new Set<string>();
  names.add(name);
  namesByEmail.set(key, names);
}

async function collectRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Error | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += ROW_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + ROW_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < ROW_PAGE_SIZE) return rows;
  }
}

export async function getUserDirectory(requestedPage: number): Promise<UserDirectoryData> {
  const session = await requireMemberContext();
  const canViewPrivateDetails = session.platformRoles?.includes("super_admin") ?? false;

  const supabase = createAdminClient();
  const listUsers = (page: number) => supabase.auth.admin.listUsers({
    page,
    perPage: PAGE_SIZE,
  });
  const firstResult = await listUsers(requestedPage);
  if (firstResult.error) throw firstResult.error;

  // auth-js currently parses only the first digit of Link header page numbers.
  let total = Math.max(firstResult.data.total ?? 0, firstResult.data.users.length);
  let lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let page = Math.min(requestedPage, lastPage);
  let result = page === requestedPage ? firstResult : await listUsers(page);
  if (result.error) throw result.error;

  if (page > 1 && result.data.users.length === 0) {
    // The last account on a page may have been deleted between requests.
    const refreshed = await listUsers(1);
    if (refreshed.error) throw refreshed.error;
    total = Math.max(refreshed.data.total ?? 0, refreshed.data.users.length);
    lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(page, lastPage);
    result = page === 1 ? refreshed : await listUsers(page);
    if (result.error) throw result.error;
  }

  const authUsers = result.data.users;
  if (authUsers.length === 0) {
    return { canViewPrivateDetails, users: [], page, lastPage, total };
  }

  const ids = authUsers.map((user) => user.id);
  const emails = authUsers
    .map((user) => user.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));

  const [profilesResult, memberships, contacts, sponsors] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    canViewPrivateDetails
      ? collectRows((from, to) => supabase
          .from("organization_members")
          .select("user_id, organizations(name)")
          .in("user_id", ids)
          .eq("status", "active")
          .order("organization_id")
          .order("user_id")
          .range(from, to))
      : Promise.resolve([]),
    emails.length
      ? collectRows((from, to) => supabase
          .from("sponsor_contacts")
          .select("email, sponsors(name, status)")
          .in("email", emails)
          .order("id")
          .range(from, to))
      : Promise.resolve([]),
    emails.length
      ? collectRows((from, to) => supabase
          .from("sponsors")
          .select("name, directory_email")
          .in("directory_email", emails)
          .eq("status", "active")
          .order("id")
          .range(from, to))
      : Promise.resolve([]),
  ]);

  if (profilesResult.error) throw profilesResult.error;

  const profileNames = new Map((profilesResult.data ?? []).map((profile) => [
    profile.id,
    profile.full_name?.trim() ?? "",
  ]));
  const organizationsByUser = new Map<string, Set<string>>();
  for (const membership of memberships) {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;
    if (!organization?.name) continue;
    const names = organizationsByUser.get(membership.user_id) ?? new Set<string>();
    names.add(organization.name);
    organizationsByUser.set(membership.user_id, names);
  }

  const sponsorNamesByEmail = new Map<string, Set<string>>();
  for (const contact of contacts) {
    const sponsor = Array.isArray(contact.sponsors)
      ? contact.sponsors[0]
      : contact.sponsors;
    if (sponsor?.status === "active") {
      addSponsorName(sponsorNamesByEmail, contact.email, sponsor.name);
    }
  }
  for (const sponsor of sponsors) {
    addSponsorName(sponsorNamesByEmail, sponsor.directory_email, sponsor.name);
  }

  return {
    canViewPrivateDetails,
    page,
    lastPage,
    total,
    users: authUsers.map((user) => {
      const email = user.email?.trim() || null;
      const confirmed = Boolean(user.email_confirmed_at);
      const sponsorNames = confirmed
        ? [...(sponsorNamesByEmail.get(email?.toLowerCase() ?? "") ?? [])].sort()
        : [];
      const suppliedName = profileNames.get(user.id)
        || String(user.user_metadata?.full_name ?? "").trim();
      const name = suppliedName && (canViewPrivateDetails || (confirmed && !suppliedName.includes("@")))
        ? suppliedName
        : canViewPrivateDetails
          ? email?.split("@")[0] || "User"
          : `Olea member ${user.id.slice(0, 8)}`;
      return {
        id: user.id,
        name,
        email: canViewPrivateDetails ? email : null,
        confirmed: canViewPrivateDetails ? confirmed : null,
        createdAt: canViewPrivateDetails ? user.created_at : null,
        organizations: canViewPrivateDetails
          ? [...(organizationsByUser.get(user.id) ?? [])].sort()
          : [],
        isSponsor: sponsorNames.length > 0,
        sponsorNames: canViewPrivateDetails ? sponsorNames : [],
      };
    }),
  };
}
