import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireMemberContext, createAdminClient } = vi.hoisted(() => ({
  requireMemberContext: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/data/member-context", () => ({ requireMemberContext }));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient }));

import {
  getOrganizationDirectory,
  parseDirectorySearch,
} from "@/lib/data/organization-directory";

function query(rows: Record<string, unknown>[], maxRows = Number.POSITIVE_INFINITY) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  const filtered = () => rows.filter((row) => filters.every((filter) => filter(row)));
  const builder = {
    select: vi.fn(),
    in: vi.fn((field: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[field]));
      return builder;
    }),
    eq: vi.fn((field: string, value: unknown) => {
      filters.push((row) => row[field] === value);
      return builder;
    }),
    order: vi.fn(),
    range: vi.fn(async (from: number, to: number) => ({
      data: filtered().slice(from, Math.min(to + 1, from + maxRows)), error: null,
    })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: filtered(), error: null }).then(resolve),
  };
  builder.select.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  return builder;
}

function user(id: string, confirmed = true) {
  return {
    id,
    email: `${id}@example.com`,
    email_confirmed_at: confirmed ? "2026-09-23T00:00:00Z" : null,
    user_metadata: {},
  };
}

function membership(organizationId: string, organizationName: string, userId: string) {
  return {
    organization_id: organizationId,
    user_id: userId,
    status: "active",
    organizations: { id: organizationId, name: organizationName },
  };
}

function setData({
  members,
  users,
  profiles = [],
  contacts = [],
  sponsors = [],
  maxRows,
}: {
  members: Record<string, unknown>[];
  users: ReturnType<typeof user>[];
  profiles?: Record<string, unknown>[];
  contacts?: Record<string, unknown>[];
  sponsors?: Record<string, unknown>[];
  maxRows?: number;
}) {
  const builders = {
    organization_members: query(members, maxRows),
    profiles: query(profiles),
    sponsor_contacts: query(contacts),
    sponsors: query(sponsors),
  };
  const listUsers = vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => ({
    data: { users: users.slice((page - 1) * perPage, page * perPage), total: users.length },
    error: null,
  }));
  createAdminClient.mockReturnValue({
    auth: { admin: { listUsers } },
    from: (table: keyof typeof builders) => builders[table],
  });
  return { builders, listUsers };
}

describe("organization directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMemberContext.mockResolvedValue({ platformRoles: [] });
  });

  it("normalizes and limits directory search", () => {
    expect(parseDirectorySearch("  Cedar  ")).toBe("Cedar");
    expect(parseDirectorySearch(["Pine", "Oak"])).toBe("Pine");
    expect(parseDirectorySearch("x".repeat(100))).toHaveLength(80);
  });

  it("groups every active member under each organization without exposing email", async () => {
    const { builders } = setData({
      members: [
        membership("oak", "Oak Centre", "alex"),
        membership("oak", "Oak Centre", "bea"),
        membership("pine", "Pine House", "alex"),
      ],
      users: [user("alex"), user("bea")],
      profiles: [
        { id: "alex", full_name: "Alex Lee" },
        { id: "bea", full_name: "Bea Smith" },
      ],
      sponsors: [{ name: "Olea Sponsor", directory_email: "alex@example.com", status: "active" }],
    });

    const directory = await getOrganizationDirectory(1, "");
    expect(directory).toMatchObject({ organizationCount: 2, personCount: 2, page: 1 });
    expect(directory.organizations).toEqual([
      {
        id: "oak",
        name: "Oak Centre",
        people: [
          { id: "alex", name: "Alex Lee", email: null, isSponsor: true },
          { id: "bea", name: "Bea Smith", email: null, isSponsor: false },
        ],
      },
      {
        id: "pine",
        name: "Pine House",
        people: [{ id: "alex", name: "Alex Lee", email: null, isSponsor: true }],
      },
    ]);
    expect(builders.organization_members.eq).toHaveBeenCalledWith("status", "active");
  });

  it("hides unconfirmed identities and email-like names from members", async () => {
    setData({
      members: [
        membership("oak", "Oak Centre", "pending"),
        membership("oak", "Oak Centre", "email-name"),
      ],
      users: [user("pending", false), user("email-name")],
      profiles: [
        { id: "pending", full_name: "Private Pending Name" },
        { id: "email-name", full_name: "hidden@example.com" },
      ],
    });

    const directory = await getOrganizationDirectory(1, "");
    expect(directory.personCount).toBe(1);
    expect(directory.organizations[0]?.people).toEqual([{
      id: "email-name",
      name: "Olea member email-na",
      email: null,
      isSponsor: false,
    }]);
  });

  it("shows private member email only to super administrators", async () => {
    requireMemberContext.mockResolvedValue({ platformRoles: ["super_admin"] });
    setData({
      members: [membership("oak", "Oak Centre", "alex")],
      users: [user("alex")],
      profiles: [{ id: "alex", full_name: "Alex Lee" }],
    });

    const directory = await getOrganizationDirectory(1, "");
    expect(directory.canViewPrivateDetails).toBe(true);
    expect(directory.organizations[0]?.people[0]?.email).toBe("alex@example.com");
  });

  it("searches organization and person names without splitting groups", async () => {
    setData({
      members: [
        membership("oak", "Oak Centre", "alex"),
        membership("oak", "Oak Centre", "bea"),
        membership("pine", "École Pine", "cam"),
      ],
      users: [user("alex"), user("bea"), user("cam")],
      profiles: [
        { id: "alex", full_name: "Alex Lee" },
        { id: "bea", full_name: "Bea Smith" },
        { id: "cam", full_name: "Cam Jones" },
      ],
    });

    const byPerson = await getOrganizationDirectory(1, "Bea");
    expect(byPerson.organizations.map((group) => group.name)).toEqual(["Oak Centre"]);
    expect(byPerson.organizations[0]?.people).toHaveLength(2);
    const byOrganization = await getOrganizationDirectory(1, "Pine");
    expect(byOrganization.organizations.map((group) => group.name)).toEqual(["École Pine"]);
    expect((await getOrganizationDirectory(1, "ecole")).organizations.map((group) => group.name))
      .toEqual(["École Pine"]);
    expect((await getOrganizationDirectory(1, "Absent")).organizations).toEqual([]);
  });

  it("paginates complete organizations and clamps a deleted last page", async () => {
    const members = Array.from({ length: 13 }, (_, index) =>
      membership(`org-${index}`, `Organization ${String(index).padStart(2, "0")}`, `user-${index}`));
    setData({ members, users: members.map((member) => user(member.user_id)) });

    const second = await getOrganizationDirectory(2, "");
    expect(second).toMatchObject({ organizationCount: 13, lastPage: 2, page: 2 });
    expect(second.organizations).toHaveLength(1);
    expect((await getOrganizationDirectory(999, "")).page).toBe(2);
  });

  it("loads later Auth pages before matching members", async () => {
    const users = Array.from({ length: 205 }, (_, index) => user(`user-${index}`));
    const { listUsers } = setData({
      members: [membership("oak", "Oak Centre", "user-204")],
      users,
      profiles: [{ id: "user-204", full_name: "Last Member" }],
    });

    const directory = await getOrganizationDirectory(1, "Last Member");
    expect(directory.organizations[0]?.people[0]?.name).toBe("Last Member");
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("handles a database row cap below the requested page size", async () => {
    setData({
      members: [
        membership("oak", "Oak Centre", "alex"),
        membership("pine", "Pine House", "bea"),
        membership("spruce", "Spruce Home", "cam"),
      ],
      users: [user("alex"), user("bea"), user("cam")],
      maxRows: 2,
    });

    expect((await getOrganizationDirectory(1, "")).organizationCount).toBe(3);
  });

  it("excludes inactive memberships and paused sponsors", async () => {
    const inactive = { ...membership("pine", "Pine House", "bea"), status: "inactive" };
    setData({
      members: [membership("oak", "Oak Centre", "alex"), inactive],
      users: [user("alex"), user("bea")],
      sponsors: [{ name: "Paused Sponsor", directory_email: "alex@example.com", status: "paused" }],
      contacts: [{ email: "alex@example.com", sponsors: { name: "Paused Sponsor", status: "paused" } }],
    });

    const directory = await getOrganizationDirectory(1, "");
    expect(directory.organizationCount).toBe(1);
    expect(directory.organizations[0]?.people[0]?.isSponsor).toBe(false);
  });

  it("fails closed when authentication fails", async () => {
    requireMemberContext.mockRejectedValue(new Error("not authenticated"));
    await expect(getOrganizationDirectory(1, "")).rejects.toThrow("not authenticated");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
