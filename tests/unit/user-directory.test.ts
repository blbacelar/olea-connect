import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireMemberContext, createAdminClient } = vi.hoisted(() => ({
  requireMemberContext: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/data/member-context", () => ({ requireMemberContext }));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient }));

import { getUserDirectory, parseUserDirectoryPage } from "@/lib/data/user-directory";

function query(rows: Record<string, unknown>[]) {
  const builder = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  builder.select.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  return builder;
}

function user(id: string, email: string | null = `${id}@example.com`) {
  return {
    id,
    email,
    email_confirmed_at: email ? "2026-09-23T00:00:00Z" : null,
    created_at: "2026-09-23T00:00:00Z",
    user_metadata: {},
  };
}

describe("user directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMemberContext.mockResolvedValue({ platformRoles: ["super_admin"] });
  });

  it("parses only positive bounded page numbers", () => {
    expect(parseUserDirectoryPage("12")).toBe(12);
    expect(parseUserDirectoryPage("0")).toBe(1);
    expect(parseUserDirectoryPage("1.5")).toBe(1);
    expect(parseUserDirectoryPage("100000")).toBe(1);
  });

  it("uses total count instead of auth-js's truncated two-digit lastPage", async () => {
    const listUsers = vi.fn(async () => ({
      data: { users: [user("page-ten")], total: 600, lastPage: 1 },
      error: null,
    }));
    createAdminClient.mockReturnValue({
      auth: { admin: { listUsers } },
      from: () => query([]),
    });

    const directory = await getUserDirectory(10);
    expect(directory).toMatchObject({ page: 10, lastPage: 12, total: 600 });
    expect(directory.users).toHaveLength(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("refreshes pagination after the last account on a page is deleted", async () => {
    const listUsers = vi.fn(async ({ page }: { page: number }) => ({
      data: page === 10
        ? { users: [], total: 451, lastPage: 1 }
        : page === 1
          ? { users: [user("first")], total: 450, lastPage: 1 }
          : { users: [user("last")], total: 450, lastPage: 1 },
      error: null,
    }));
    createAdminClient.mockReturnValue({
      auth: { admin: { listUsers } },
      from: () => query([]),
    });

    const directory = await getUserDirectory(10);
    expect(directory).toMatchObject({ page: 9, lastPage: 9, total: 450 });
    expect(directory.users[0]?.id).toBe("last");
    expect(listUsers.mock.calls.map(([request]) => request.page)).toEqual([10, 1, 9]);
  });

  it("loads membership and sponsor matches beyond 500 rows", async () => {
    const memberships = Array.from({ length: 501 }, (_, index) => ({
      user_id: "many",
      organizations: { name: `Organization ${index}` },
    }));
    const contacts = Array.from({ length: 501 }, (_, index) => ({
      email: "many@example.com",
      sponsors: { name: `Sponsor ${index}`, status: "active" },
    }));
    const builders = {
      profiles: query([]),
      organization_members: query(memberships),
      sponsor_contacts: query(contacts),
      sponsors: query([]),
    };
    createAdminClient.mockReturnValue({
      auth: { admin: { listUsers: vi.fn(async () => ({
        data: { users: [user("many")], total: 1, lastPage: 1 },
        error: null,
      })) } },
      from: (table: keyof typeof builders) => builders[table],
    });

    const directory = await getUserDirectory(1);
    expect(directory.users[0]?.organizations).toHaveLength(501);
    expect(directory.users[0]?.sponsorNames).toHaveLength(501);
    expect(builders.organization_members.range).toHaveBeenCalledTimes(2);
    expect(builders.sponsor_contacts.range).toHaveBeenCalledTimes(2);
  });

  it("returns only display names and sponsor badges to ordinary members", async () => {
    requireMemberContext.mockResolvedValue({ platformRoles: [] });
    const from = vi.fn((table: string) => {
      if (table === "organization_members") throw new Error("Private membership query was made");
      if (table === "profiles") return query([{ id: "member", full_name: "Taylor Member" }]);
      if (table === "sponsors") return query([{
        name: "Community Sponsor",
        directory_email: "member@example.com",
      }]);
      return query([]);
    });
    createAdminClient.mockReturnValue({
      auth: { admin: { listUsers: vi.fn(async () => ({
        data: { users: [user("member")], total: 1, lastPage: 1 },
        error: null,
      })) } },
      from,
    });

    const directory = await getUserDirectory(1);
    expect(directory.canViewPrivateDetails).toBe(false);
    expect(directory.users[0]).toMatchObject({
      name: "Taylor Member",
      email: null,
      confirmed: null,
      createdAt: null,
      organizations: [],
      isSponsor: true,
      sponsorNames: [],
    });
    expect(from).not.toHaveBeenCalledWith("organization_members");
  });

  it("does not expose an email used as a display name", async () => {
    requireMemberContext.mockResolvedValue({ platformRoles: [] });
    createAdminClient.mockReturnValue({
      auth: { admin: { listUsers: vi.fn(async () => ({
        data: { users: [user("member")], total: 1, lastPage: 1 },
        error: null,
      })) } },
      from: (table: string) => table === "profiles"
        ? query([{ id: "member", full_name: "private@example.com" }])
        : query([]),
    });

    const directory = await getUserDirectory(1);
    expect(directory.users[0]?.name).toBe("Olea member member");
    expect(directory.users[0]?.email).toBeNull();
  });

  it("does not expose the name of an unconfirmed account to members", async () => {
    requireMemberContext.mockResolvedValue({ platformRoles: [] });
    createAdminClient.mockReturnValue({
      auth: { admin: { listUsers: vi.fn(async () => ({
        data: { users: [{ ...user("pending"), email_confirmed_at: null }], total: 1, lastPage: 1 },
        error: null,
      })) } },
      from: (table: string) => table === "profiles"
        ? query([{ id: "pending", full_name: "Private Pending Name" }])
        : query([]),
    });

    const directory = await getUserDirectory(1);
    expect(directory.users[0]?.name).toBe("Olea member pending");
    expect(directory.users[0]?.confirmed).toBeNull();
  });
});
