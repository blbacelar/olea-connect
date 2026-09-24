import "server-only";

import type { User } from "@supabase/supabase-js";

import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";

const AUTH_PAGE_SIZE = 200;
const ROW_PAGE_SIZE = 500;
const QUERY_BATCH_SIZE = 20;
const DIRECTORY_PAGE_SIZE = 12;

export type DirectoryPerson = {
  id: string;
  name: string;
  email: string | null;
  isSponsor: boolean;
};

export type DirectoryOrganization = {
  id: string;
  name: string;
  people: DirectoryPerson[];
};

export type OrganizationDirectoryData = {
  canViewPrivateDetails: boolean;
  organizations: DirectoryOrganization[];
  organizationCount: number;
  personCount: number;
  page: number;
  lastPage: number;
  search: string;
};

export function parseDirectorySearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 80);
}

function searchable(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

async function collectRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Error | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ;) {
    const { data, error } = await fetchPage(from, from + ROW_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data?.length) return rows;
    from += data.length;
  }
}

async function listAllUsers(
  listUsers: (page: number) => Promise<{ data: { users: User[]; total?: number }; error: Error | null }>,
) {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await listUsers(page);
    if (error) throw error;
    users.push(...data.users);
    if (!data.users.length || (data.total != null && data.total > 0 && users.length >= data.total)
      || (data.users.length < AUTH_PAGE_SIZE && !data.total)) {
      return users;
    }
  }
}

async function collectBatches<T, V>(
  values: V[],
  fetchBatch: (batch: V[]) => Promise<T[]>,
) {
  const rows: T[] = [];
  for (let start = 0; start < values.length; start += QUERY_BATCH_SIZE) {
    rows.push(...await fetchBatch(values.slice(start, start + QUERY_BATCH_SIZE)));
  }
  return rows;
}

export async function getOrganizationDirectory(
  requestedPage: number,
  search: string,
  locale = "en-CA",
): Promise<OrganizationDirectoryData> {
  const session = await requireMemberContext();
  const canViewPrivateDetails = session.platformRoles?.includes("super_admin") ?? false;
  const supabase = createAdminClient();

  const memberships = await collectRows((from, to) => supabase
    .from("organization_members")
    .select("organization_id, user_id, organizations(id, name)")
    .eq("status", "active")
    .order("organization_id")
    .order("user_id")
    .range(from, to));

  if (!memberships.length) {
    return {
      canViewPrivateDetails, organizations: [], organizationCount: 0,
      personCount: 0, page: 1, lastPage: 1, search,
    };
  }

  const authUsers = await listAllUsers((page) => supabase.auth.admin.listUsers({
    page,
    perPage: AUTH_PAGE_SIZE,
  }));
  const usersById = new Map(authUsers.map((user) => [user.id, user]));
  const visibleMemberships = memberships.filter((membership) => {
    const user = usersById.get(membership.user_id);
    return user && (canViewPrivateDetails || Boolean(user.email_confirmed_at));
  });
  const ids = [...new Set(visibleMemberships.map((membership) => membership.user_id))];
  const emails = [...new Set(ids
    .map((id) => usersById.get(id)?.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email)))];

  const [profiles, contacts, sponsors] = await Promise.all([
    collectBatches(ids, async (batch) => {
      const { data, error } = await supabase.from("profiles")
        .select("id, full_name").in("id", batch);
      if (error) throw error;
      return data ?? [];
    }),
    collectBatches(emails, (batch) => collectRows((from, to) => supabase
      .from("sponsor_contacts")
      .select("email, sponsors(name, status)")
      .in("email", batch)
      .order("id")
      .range(from, to))),
    collectBatches(emails, (batch) => collectRows((from, to) => supabase
      .from("sponsors")
      .select("name, directory_email")
      .in("directory_email", batch)
      .eq("status", "active")
      .order("id")
      .range(from, to))),
  ]);

  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.full_name?.trim() ?? ""]));
  const sponsorEmails = new Set<string>();
  for (const contact of contacts) {
    const sponsor = Array.isArray(contact.sponsors) ? contact.sponsors[0] : contact.sponsors;
    if (sponsor?.status === "active" && contact.email) {
      sponsorEmails.add(contact.email.trim().toLowerCase());
    }
  }
  for (const sponsor of sponsors) {
    if (sponsor.directory_email) sponsorEmails.add(sponsor.directory_email.trim().toLowerCase());
  }

  const groups = new Map<string, DirectoryOrganization>();
  for (const membership of visibleMemberships) {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;
    const user = usersById.get(membership.user_id);
    if (!organization?.id || !organization.name || !user) continue;
    const email = user.email?.trim() || null;
    const suppliedName = profileNames.get(user.id)
      || String(user.user_metadata?.full_name ?? "").trim();
    const name = suppliedName && (canViewPrivateDetails || !suppliedName.includes("@"))
      ? suppliedName
      : canViewPrivateDetails
        ? email?.split("@")[0] || "User"
        : `Olea member ${user.id.slice(0, 8)}`;
    const group: DirectoryOrganization = groups.get(organization.id) ?? {
      id: organization.id,
      name: organization.name,
      people: [],
    };
    group.people.push({
      id: user.id,
      name,
      email: canViewPrivateDetails ? email : null,
      isSponsor: Boolean(user.email_confirmed_at && email && sponsorEmails.has(email.toLowerCase())),
    });
    groups.set(organization.id, group);
  }

  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const needle = searchable(search);
  const matching = [...groups.values()]
    .filter((group) => !needle || searchable(group.name).includes(needle)
      || group.people.some((person) => searchable(person.name).includes(needle)))
    .sort((a, b) => collator.compare(a.name, b.name));
  for (const group of matching) {
    group.people.sort((a, b) => collator.compare(a.name, b.name));
  }

  const organizationCount = matching.length;
  const personCount = new Set(matching.flatMap((group) => group.people.map((person) => person.id))).size;
  const lastPage = Math.max(1, Math.ceil(organizationCount / DIRECTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, lastPage);
  return {
    canViewPrivateDetails,
    organizations: matching.slice((page - 1) * DIRECTORY_PAGE_SIZE, page * DIRECTORY_PAGE_SIZE),
    organizationCount,
    personCount,
    page,
    lastPage,
    search,
  };
}
