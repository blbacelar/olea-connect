import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn() }));

import { loadGrantPlatformRows } from "@/lib/data/grant-platform-queries";

function createQueryClient(applicationError: Error | null) {
  return {
    from(table: string) {
      const result = table === "grant_applications"
        ? { data: null, error: applicationError }
        : { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
      };
      return builder;
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  } as unknown as Parameters<typeof loadGrantPlatformRows>[0];
}

describe("grant platform data loading", () => {
  it("rejects a board report if the applications query fails", async () => {
    const client = createQueryClient(new Error("applications unavailable"));
    await expect(loadGrantPlatformRows(client, "org-1", { requireApplications: true }))
      .rejects.toThrow("applications unavailable");
  });

  it("keeps the existing workspace fallback when strict loading is not requested", async () => {
    const client = createQueryClient(new Error("applications unavailable"));
    const rows = await loadGrantPlatformRows(client, "org-1");
    expect(rows.applications).toEqual([]);
  });
});
