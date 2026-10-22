import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cleanupGeneratedDocuments = vi.fn();

vi.mock("@/lib/generated-documents/cleanup", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/generated-documents/cleanup")>();

  return {
    ...actual,
    cleanupGeneratedDocuments,
  };
});

describe("generated document cleanup helpers", () => {
  it("defaults invalid retention values to 24 hours", async () => {
    const { parseGeneratedDocumentRetentionHours } = await import(
      "@/lib/generated-documents/cleanup"
    );

    expect(parseGeneratedDocumentRetentionHours()).toBe(24);
    expect(parseGeneratedDocumentRetentionHours("0")).toBe(24);
    expect(parseGeneratedDocumentRetentionHours("bad-value")).toBe(24);
    expect(parseGeneratedDocumentRetentionHours("72")).toBe(72);
  });

  it("calculates a retention cutoff from the provided clock", async () => {
    const { getGeneratedDocumentCleanupCutoff } = await import(
      "@/lib/generated-documents/cleanup"
    );

    expect(
      getGeneratedDocumentCleanupCutoff({
        now: new Date("2026-07-09T12:00:00.000Z"),
        retentionHours: 24,
      }).toISOString(),
    ).toBe("2026-07-08T12:00:00.000Z");
  });

  it("chunks deletion batches without dropping values", async () => {
    const { chunkArray } = await import("@/lib/generated-documents/cleanup");

    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("generated document cleanup route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron_test_secret");
    cleanupGeneratedDocuments.mockResolvedValue({
      bucket: "generated-documents",
      cutoff: "2026-07-08T12:00:00.000Z",
      deletedExports: 0,
      deletedFiles: 0,
      dryRun: true,
      matchedExports: 3,
      retentionHours: 24,
    });
  });

  it("rejects requests without the cron secret", async () => {
    const { GET } = await import(
      "@/app/api/v1/generated-documents/cleanup/route"
    );

    const response = await GET(
      new Request("https://staging.oleaconnects.com/api/v1/generated-documents/cleanup"),
    );

    expect(response.status).toBe(401);
    expect(cleanupGeneratedDocuments).not.toHaveBeenCalled();
  });

  it("runs a dry cleanup when authorized with dryRun=1", async () => {
    const { GET } = await import(
      "@/app/api/v1/generated-documents/cleanup/route"
    );

    const response = await GET(
      new Request(
        "https://staging.oleaconnects.com/api/v1/generated-documents/cleanup?dryRun=1",
        {
          headers: {
            authorization: "Bearer cron_test_secret",
          },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(cleanupGeneratedDocuments).toHaveBeenCalledWith({ dryRun: true });
  });
});
