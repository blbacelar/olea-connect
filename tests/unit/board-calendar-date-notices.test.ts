import { describe, expect, it, vi } from "vitest";

import {
  boardCalendarDateDeliveryKey,
  getBoardCalendarDateNotices,
} from "@/lib/template-renderer/board-calendar-date-notices";

describe("board calendar date notices", () => {
  it("queues only upcoming meetings with delivery enabled", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T18:00:00Z"));
    try {
      const notices = getBoardCalendarDateNotices({ meetings: [
        { id: "old", date: "2026-11-11", type: "Board Meeting", notify_mode: "review" },
        { id: "quiet", date: "2026-11-20", type: "Board Meeting", notify_mode: "none" },
        { id: "review", date: "2026-11-20", type: "Board Meeting", time: "18:30", location: "Hall", notify_mode: "review" },
        { id: "auto", date: "2026-12-20", type: "Finance", notify_mode: "auto" },
      ] });
      expect(notices.map((notice) => notice.id)).toEqual(["review", "auto"]);
      expect(notices.map((notice) => notice.mode)).toEqual(["review", "auto"]);
      expect(notices[0].location).toBe("Hall");
    } finally { vi.useRealTimers(); }
  });

  it("changes delivery identity when material details or recipient change", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T18:00:00Z"));
    try {
      const before = getBoardCalendarDateNotices({ meetings: [{ id: "m1", date: "2026-11-20", time: "18:30" }] })[0];
      const after = getBoardCalendarDateNotices({ meetings: [{ id: "m1", date: "2026-11-20", time: "19:00" }] })[0];
      expect(boardCalendarDateDeliveryKey("i1", before, "u1"))
        .not.toBe(boardCalendarDateDeliveryKey("i1", after, "u1"));
      expect(boardCalendarDateDeliveryKey("i1", before, "u1"))
        .not.toBe(boardCalendarDateDeliveryKey("i1", before, "u2"));
    } finally { vi.useRealTimers(); }
  });
});
