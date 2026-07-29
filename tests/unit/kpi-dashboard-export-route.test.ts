import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(() => ({
    storage: {},
  })),
  createBrandingSnapshot: vi.fn(),
  buildExportFileName: vi.fn(),
  getKpiDashboardData: vi.fn(),
  getOptionalMemberContext: vi.fn(),
  renderKpiDashboardPdfBuffer: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/data/kpi-dashboard", () => ({
  getKpiDashboardData: routeMocks.getKpiDashboardData,
}));

vi.mock("@/lib/data/member-context", () => ({
  getOptionalMemberContext: routeMocks.getOptionalMemberContext,
}));

vi.mock("@/lib/data/brand-assets", () => ({
  createBrandingSnapshot: routeMocks.createBrandingSnapshot,
}));

vi.mock("@/lib/kpi-dashboard/pdf-export", () => ({
  renderKpiDashboardPdfBuffer: routeMocks.renderKpiDashboardPdfBuffer,
}));

vi.mock("@/lib/template-renderer/export-files", () => ({
  buildExportFileName: routeMocks.buildExportFileName,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

describe("KPI dashboard PDF export route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    routeMocks.createBrandingSnapshot.mockResolvedValue({
      organizationName: "Olea",
      primaryColor: "#446B52",
      secondaryColor: "#F4EFE4",
      logoInitials: "OC",
    });
    routeMocks.getKpiDashboardData.mockResolvedValue({
      dashboard: {
        organizationName: "Olea",
        title: "KPI Dashboard and Board Reporting",
      },
    });
    routeMocks.renderKpiDashboardPdfBuffer.mockResolvedValue(
      Buffer.from("%PDF-test"),
    );
    routeMocks.buildExportFileName.mockReturnValue("olea-kpi-report.pdf");
  });

  it("rejects unauthenticated requests before loading report data", async () => {
    routeMocks.getOptionalMemberContext.mockResolvedValue(null);
    const { GET } = await import("@/app/api/kpi-dashboard/export/route");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(routeMocks.getKpiDashboardData).not.toHaveBeenCalled();
    expect(routeMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns a PDF attachment for an authenticated member", async () => {
    routeMocks.getOptionalMemberContext.mockResolvedValue({
      organization: {
        brand: {
          organizationName: "Olea",
        },
      },
    });
    const { GET } = await import("@/app/api/kpi-dashboard/export/route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      'filename="olea-kpi-report.pdf"',
    );
    expect(routeMocks.renderKpiDashboardPdfBuffer).toHaveBeenCalledOnce();
  });
});
