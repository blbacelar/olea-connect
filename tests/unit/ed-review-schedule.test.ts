import { describe, expect, it } from "vitest";

import { localDateTimeToIso } from "@/lib/ed-review/schedule";

describe("ED review campaign scheduling", () => {
  it("converts a browser-local datetime to an offset-aware ISO timestamp", () => {
    const value = localDateTimeToIso("2026-08-12T09:30");

    expect(value).toMatch(/^2026-08-12T\d{2}:30:00\.000Z$/);
  });

  it("rejects malformed local datetime values", () => {
    expect(localDateTimeToIso("2026-08-12")).toBeNull();
    expect(localDateTimeToIso("not-a-date")).toBeNull();
  });
});
