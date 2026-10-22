import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: 0,
  error: null as Error | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ count: mocks.count, error: mocks.error }),
      }),
    }),
  }),
}));

describe("founding availability", () => {
  beforeEach(() => {
    mocks.count = 0;
    mocks.error = null;
  });

  it("keeps the counter hidden until ten organizations have paid", async () => {
    const { getFoundingAvailability } = await import("@/lib/founding-availability");
    mocks.count = 9;
    expect(await getFoundingAvailability()).toEqual({
      left: 41,
      showCount: false,
      foundingAvailable: true,
    });
    mocks.count = 10;
    expect(await getFoundingAvailability()).toEqual({
      left: 40,
      showCount: true,
      foundingAvailable: true,
    });
  });

  it("closes the offer after the fiftieth paid organization", async () => {
    const { getFoundingAvailability } = await import("@/lib/founding-availability");
    mocks.count = 50;
    expect(await getFoundingAvailability()).toEqual({
      left: 0,
      showCount: true,
      foundingAvailable: false,
    });
  });

  it("does not invent availability after a database error", async () => {
    const { getFoundingAvailability } = await import("@/lib/founding-availability");
    mocks.error = new Error("database unavailable");
    await expect(getFoundingAvailability()).rejects.toThrow("database unavailable");
  });
});
