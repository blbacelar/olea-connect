import { describe, expect, it } from "vitest";

import {
  getRemainingInviteSeatCount,
  getReservedSeatCount,
} from "@/lib/team/seats";

describe("team seat math", () => {
  it("reserves the signed-in member seat even when the active count is unavailable", () => {
    expect(getReservedSeatCount(0, 0)).toBe(1);
  });

  it("counts active members and pending invitations as reserved seats", () => {
    expect(getReservedSeatCount(2, 3)).toBe(5);
  });

  it("shows only remaining invite slots, not the total seat limit", () => {
    expect(getRemainingInviteSeatCount(4, 1)).toBe(3);
  });

  it("does not return negative remaining invite slots", () => {
    expect(getRemainingInviteSeatCount(4, 5)).toBe(0);
  });
});
