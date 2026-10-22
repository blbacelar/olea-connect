import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  BOARD_CALENDAR_REMINDER_TYPE,
  processBoardCalendarReminders,
} from "@/lib/notifications/board-calendar-reminders";

function makeSelectChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (
      resolve: (value: { data?: unknown; error?: unknown }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };

  return chain;
}

function makeSupabase({
  insertedIds,
  instances,
  members,
  onNotifications,
}: {
  insertedIds?: string[];
  instances: unknown[];
  members: unknown[];
  onNotifications?: (rows: unknown[]) => void;
}) {
  const notificationsTable = {
    upsert: vi.fn((rows: unknown[]) => {
      onNotifications?.(rows);
      return {
        select: vi.fn(async () => ({
          data: (insertedIds ?? rows.map((_, index) => `notification-${index}`)).map(
            (id) => ({ id }),
          ),
          error: null,
        })),
      };
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "template_instances") {
        return makeSelectChain({ data: instances, error: null });
      }
      if (table === "organization_members") {
        return makeSelectChain({ data: members, error: null });
      }
      if (table === "notifications") {
        return notificationsTable;
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;
}

describe("board calendar reminders", () => {
  it("creates reminder notifications for active organization members", async () => {
    const notificationRows: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      instances: [
        {
          id: "calendar-1",
          organization_id: "org-1",
          title: "Board Calendar",
          form_data: {
            meetings: [
              {
                date: "2026-07-13",
                type: "Board Meeting",
                committee: "Finance review",
                time: "10:30",
              },
            ],
            tasks: [
              {
                due_date: "2026-07-14",
                task: "Send board package",
                related_meeting: "Finance review",
              },
            ],
          },
        },
      ],
      members: [
        { organization_id: "org-1", user_id: "user-1" },
        { organization_id: "org-1", user_id: "user-2" },
      ],
      onNotifications(rows) {
        notificationRows.push(...(rows as Array<Record<string, unknown>>));
      },
    });

    const summary = await processBoardCalendarReminders({
      now: new Date(2026, 6, 13, 9),
      supabase,
    });

    expect(summary).toMatchObject({
      dryRun: false,
      matchedEvents: 2,
      notificationsCreated: 4,
      notificationsMatched: 4,
      notifiedUsers: 2,
      scannedInstances: 1,
      targetDates: ["2026-07-13", "2026-07-14"],
    });
    expect(notificationRows).toHaveLength(4);
    expect(notificationRows[0]).toMatchObject({
      action_url: "/modules/board-calendar?session=calendar-1",
      organization_id: "org-1",
      severity: "info",
      type: BOARD_CALENDAR_REMINDER_TYPE,
    });
    expect(notificationRows.map((row) => row.title)).toEqual(
      expect.arrayContaining([
        "Board calendar meeting coming up",
        "Board calendar task coming up",
      ]),
    );
  });

  it("reports zero created notifications when existing idempotency keys are ignored", async () => {
    const supabase = makeSupabase({
      insertedIds: [],
      instances: [
        {
          id: "calendar-1",
          organization_id: "org-1",
          title: "Board Calendar",
          form_data: {
            meetings: [
              {
                date: "2026-07-13",
                type: "Board Meeting",
                committee: "Finance review",
              },
            ],
          },
        },
      ],
      members: [{ organization_id: "org-1", user_id: "user-1" }],
    });

    const summary = await processBoardCalendarReminders({
      now: new Date(2026, 6, 13, 9),
      supabase,
    });

    expect(summary.notificationsMatched).toBe(1);
    expect(summary.notificationsCreated).toBe(0);
  });

  it("only creates notifications for active members returned by the membership query", async () => {
    const notificationRows: Array<Record<string, unknown>> = [];
    const supabase = makeSupabase({
      instances: [
        {
          id: "calendar-1",
          organization_id: "org-1",
          title: "Board Calendar",
          form_data: {
            meetings: [
              {
                date: "2026-07-13",
                type: "Board Meeting",
                committee: "Finance review",
              },
            ],
          },
        },
      ],
      members: [{ organization_id: "org-1", user_id: "active-user" }],
      onNotifications(rows) {
        notificationRows.push(...(rows as Array<Record<string, unknown>>));
      },
    });

    const summary = await processBoardCalendarReminders({
      now: new Date(2026, 6, 13, 9),
      supabase,
    });

    expect(summary.notificationsMatched).toBe(1);
    expect(summary.notifiedUsers).toBe(1);
    expect(notificationRows).toHaveLength(1);
    expect(notificationRows[0]?.user_id).toBe("active-user");
  });
});
