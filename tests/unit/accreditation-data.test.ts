import { describe, expect, it } from "vitest";

import { hasAccreditationWorkspaceAccess } from "@/lib/data/accreditation-access";

describe("accreditation workspace access checks", () => {
  it("allows access when no explicit access rows are configured", () => {
    expect(
      hasAccreditationWorkspaceAccess({
        directAccess: [],
        organizationTier: "seedling",
        planAccess: [],
      }),
    ).toBe(true);
  });

  it("allows access when the current plan is explicitly granted", () => {
    expect(
      hasAccreditationWorkspaceAccess({
        directAccess: [],
        organizationTier: "roots",
        planAccess: [{ plan_id: "roots" }],
      }),
    ).toBe(true);
  });

  it("denies access when explicit plan access rows exist but do not include the current plan", () => {
    expect(
      hasAccreditationWorkspaceAccess({
        directAccess: [],
        organizationTier: "seedling",
        planAccess: [{ plan_id: "roots" }],
      }),
    ).toBe(false);
  });
});
