import { describe, expect, it } from "vitest";

import { getResourceHref } from "@/lib/modules";
import { buildGrantPlatformTemplate } from "@/lib/templates/grant-platform";

describe("grant platform template content", () => {
  it("returns handoff-based workspace sections for the new template", () => {
    const template = buildGrantPlatformTemplate();

    expect(template.slug).toBe("grant-platform");
    expect(template.name).toBe("Grant Platform Workspace");
    expect(template.category).toBe("Grant Management");
    expect(template.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["dashboard", "pipeline", "coaching", "reports", "settings"]),
    );
    expect(template.sections[0]?.title).toBe("Dashboard");
  });

  it("maps the grant platform slug to the module route", () => {
    expect(getResourceHref("grant-platform")).toBe("/modules/grant-platform");
  });
});
