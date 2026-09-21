import { describe, expect, it } from "vitest";

import {
  isWellFormedFoundingMemberCode,
  normalizeFoundingMemberCode,
} from "@/lib/founding-member";

describe("founding-member code", () => {
  it("normalizes a well-formed code without publishing a valid credential", () => {
    expect(normalizeFoundingMemberCode(" founding-15 ")).toBe("FOUNDING-15");
    expect(isWellFormedFoundingMemberCode("founding-15")).toBe(true);
    expect(isWellFormedFoundingMemberCode("another-code")).toBe(true);
  });

  it("rejects unsupported characters and preserves an empty optional value", () => {
    expect(normalizeFoundingMemberCode("")).toBe("");
    expect(normalizeFoundingMemberCode("founding member")).toBeNull();
    expect(isWellFormedFoundingMemberCode("founding member")).toBe(false);
  });
});
