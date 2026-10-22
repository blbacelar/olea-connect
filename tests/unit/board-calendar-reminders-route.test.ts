import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const processBoardCalendarReminders = vi.fn();

vi.mock("@/lib/notifications/board-calendar-reminders", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/notifications/board-calendar-reminders")
    >();

  return {
    ...actual,
    processBoardCalendarReminders,
  };
});

describe("board calendar reminders route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron_test_secret");
    processBoardCalendarReminders.mockResolvedValue({
      dryRun: true,
      matchedEvents: 2,
      notifiedUsers: 1,
      notificationsCreated: 0,
      notificationsMatched: 2,
      scannedInstances: 1,
      targetDates: ["2026-07-13", "2026-07-14"],
    });
  });

  it("rejects requests without the cron secret", async () => {
    const { GET } = await import(
      "@/app/api/v1/notifications/board-calendar-reminders/route"
    );

    const response = await GET(
      new Request(
        "https://staging.oleaconnects.com/api/v1/notifications/board-calendar-reminders",
      ),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized." });
    expect(processBoardCalendarReminders).not.toHaveBeenCalled();
  });

  it("runs a dry reminder pass when authorized with dryRun=1", async () => {
    const { GET } = await import(
      "@/app/api/v1/notifications/board-calendar-reminders/route"
    );

    const response = await GET(
      new Request(
        "https://staging.oleaconnects.com/api/v1/notifications/board-calendar-reminders?dryRun=1",
        {
          headers: {
            authorization: "Bearer cron_test_secret",
          },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      dryRun: true,
      matchedEvents: 2,
      notificationsMatched: 2,
    });
    expect(processBoardCalendarReminders).toHaveBeenCalledWith({
      dryRun: true,
    });
  });
});
