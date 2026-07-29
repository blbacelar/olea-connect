import { describe, expect, it } from "vitest";

import { getNavigationGroups } from "@/components/navigation";

function navigationLabelsFor(
  roles: Parameters<typeof getNavigationGroups>[0],
  organizationRole?: Parameters<typeof getNavigationGroups>[1],
) {
  return getNavigationGroups(roles, organizationRole)
    .flat()
    .map((item) => item.label);
}

describe("application navigation", () => {
  it("shows member sponsor directory navigation to regular members", () => {
    expect(navigationLabelsFor([])).toContain("Sponsors");
  });

  it("shows the KPI dashboard module to regular members", () => {
    expect(navigationLabelsFor([])).toContain("KPI Dashboard");
  });

  it("hides Board Recruitment from regular organization members", () => {
    expect(navigationLabelsFor([], "member")).not.toContain(
      "Board Recruitment",
    );
  });

  it("shows Board Recruitment to organization administrators", () => {
    expect(navigationLabelsFor([], "admin")).toContain("Board Recruitment");
  });

  it("hides operator navigation from regular members", () => {
    expect(navigationLabelsFor([])).not.toContain("Operations");
  });

  it("shows the operations console to super admins", () => {
    expect(navigationLabelsFor(["super_admin"])).toContain("Operations");
  });
});
