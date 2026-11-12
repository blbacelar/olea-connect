import { describe, expect, it } from "vitest";

import { getComplimentaryAccessKind } from "@/lib/billing/complimentary-access";

describe("complimentary billing access", () => {
  it("recognizes only approved manual funding sources", () => {
    expect(getComplimentaryAccessKind("manual", { funding_source: "developer" })).toBe("developer");
    expect(getComplimentaryAccessKind("manual", { funding_source: "sponsorship" })).toBe("sponsorship");
    expect(getComplimentaryAccessKind("stripe", { funding_source: "developer" })).toBeNull();
    expect(getComplimentaryAccessKind("manual", { funding_source: "unrecognized" })).toBeNull();
    expect(getComplimentaryAccessKind("manual", null)).toBeNull();
  });
});
