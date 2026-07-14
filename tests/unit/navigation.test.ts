import { describe, expect, it } from "vitest";

import { getNavigationGroups } from "@/components/navigation";

function navigationLabelsFor(roles: Parameters<typeof getNavigationGroups>[0]) {
  return getNavigationGroups(roles)
    .flat()
    .map((item) => item.label);
}

describe("application navigation", () => {
  it("shows member sponsor directory navigation to regular members", () => {
    expect(navigationLabelsFor([])).toContain("Sponsors");
  });

  it("hides operator navigation from regular members", () => {
    expect(navigationLabelsFor([])).not.toContain("Operations");
  });

  it("shows the operations console to super admins", () => {
    expect(navigationLabelsFor(["super_admin"])).toContain("Operations");
  });
});
