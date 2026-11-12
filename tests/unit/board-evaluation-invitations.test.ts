import { describe, expect, it } from "vitest";

import { parseBoardEvaluationInviteEmails } from "@/lib/board-evaluation/invitations";

describe("board evaluation invitations", () => {
  it("accepts line-separated addresses and deduplicates without case sensitivity", () => {
    expect(parseBoardEvaluationInviteEmails("A@Example.org\nb@example.org; a@example.org"))
      .toEqual(["a@example.org", "b@example.org"]);
  });

  it("rejects malformed or oversized recipient lists", () => {
    expect(() => parseBoardEvaluationInviteEmails("not-an-email")).toThrow("Check the email");
    expect(() => parseBoardEvaluationInviteEmails(" ")).toThrow("at least one");
    expect(() => parseBoardEvaluationInviteEmails(Array.from({ length: 101 }, (_, i) => `b${i}@example.org`).join("\n")))
      .toThrow("at most 100");
  });
});
