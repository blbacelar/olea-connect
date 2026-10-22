import { describe, expect, it } from "vitest";

import { resolveKpiDashboardTab } from "@/app/modules/kpi-dashboard/tab-state";

describe("resolveKpiDashboardTab", () => {
  it("forces setup when the dashboard has not been configured", () => {
    expect(resolveKpiDashboardTab(undefined, false)).toBe("setup");
    expect(resolveKpiDashboardTab("board", false)).toBe("setup");
    expect(resolveKpiDashboardTab("q1", false)).toBe("setup");
  });

  it("keeps the existing setup fallback for an unspecified or invalid tab", () => {
    expect(resolveKpiDashboardTab(undefined, true)).toBe("setup");
    expect(resolveKpiDashboardTab("not-a-tab", true)).toBe("setup");
  });

  it("preserves valid navigation for a configured dashboard", () => {
    expect(resolveKpiDashboardTab("q1", true)).toBe("q1");
    expect(resolveKpiDashboardTab("settings", true)).toBe("settings");
    expect(resolveKpiDashboardTab("setup", true)).toBe("setup");
  });
});
