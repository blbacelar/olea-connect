import { describe, expect, it } from "vitest";

import { getBoardCalendarSecurity } from "@/lib/template-renderer/board-calendar-security";

describe("Board Calendar document security", () => {
  it("keeps the source HTML defaults for existing calendars", () => {
    expect(getBoardCalendarSecurity({})).toEqual({
      requireAck: true, logAccess: true, watermark: true,
    });
  });

  it("only treats explicit booleans as disabled controls", () => {
    expect(getBoardCalendarSecurity({ security: {
      requireAck: false, logAccess: false, watermark: false,
    } })).toEqual({ requireAck: false, logAccess: false, watermark: false });
    expect(getBoardCalendarSecurity({ security: { requireAck: "false" } })).toEqual({
      requireAck: true, logAccess: true, watermark: true,
    });
  });
});
