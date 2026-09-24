import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getOptionalMemberContext = vi.fn();
const getGrantPlatformData = vi.fn();
const createBrandingSnapshot = vi.fn();
const renderGrantBoardReportPdfBuffer = vi.fn();
const logError = vi.fn();
const maybeSingle = vi.fn();
const download = vi.fn();
const insert = vi.fn();
const eq = vi.fn(() => ({ eq, maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select, insert }));
const createAdminClient = vi.fn(() => ({
  from,
  storage: { from: vi.fn(() => ({ download })) },
}));

vi.mock("@/lib/data/member-context", () => ({ getOptionalMemberContext }));
vi.mock("@/lib/data/grant-platform", () => ({ getGrantPlatformData }));
vi.mock("@/lib/data/brand-assets", () => ({ createBrandingSnapshot }));
vi.mock("@/lib/grants/board-report-pdf", () => ({ renderGrantBoardReportPdfBuffer }));
vi.mock("@/lib/observability/logger", () => ({ logError }));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient }));

const exportId = "c4761905-2460-4f3e-b498-ec8f3f82ec70";
const session = {
  member: { id: "member-1", role: "Organization owner" },
  organization: { id: "organization-1", name: "Olea QA", brand: {} },
};

describe("report download routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getOptionalMemberContext.mockResolvedValue(session);
    maybeSingle.mockResolvedValue({
      data: { storage_path: "organization-1/report.pdf", file_name: "report.pdf", format: "pdf" },
      error: null,
    });
    download.mockResolvedValue({ data: new Blob(["%PDF-test"]), error: null });
    insert.mockResolvedValue({ error: null });
    getGrantPlatformData.mockResolvedValue({ organizationName: "Olea QA", applications: [] });
    createBrandingSnapshot.mockResolvedValue({ organizationName: "Olea QA" });
    renderGrantBoardReportPdfBuffer.mockResolvedValue(Buffer.from("%PDF-test"));
  });

  it("requires authentication for a template export", async () => {
    getOptionalMemberContext.mockResolvedValue(null);
    const { GET } = await import("@/app/api/template-exports/[exportId]/download/route");
    const response = await GET(new Request("http://localhost"), { params: { exportId } });
    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("checks organization ownership before streaming a template export", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { GET } = await import("@/app/api/template-exports/[exportId]/download/route");
    const response = await GET(new Request("http://localhost"), { params: { exportId } });
    expect(response.status).toBe(404);
    expect(eq).toHaveBeenCalledWith("organization_id", session.organization.id);
    expect(download).not.toHaveBeenCalled();
  });

  it("serves the PDF as a same-origin attachment", async () => {
    const { GET } = await import("@/app/api/template-exports/[exportId]/download/route");
    const response = await GET(new Request("http://localhost"), { params: { exportId } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="report.pdf"');
    expect(await response.text()).toBe("%PDF-test");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      export_id: exportId,
      downloaded_by: session.member.id,
      organization_id: session.organization.id,
    }));
  });

  it("rejects a same-tenant record pointing to another organization's storage file", async () => {
    maybeSingle.mockResolvedValue({
      data: { storage_path: "another-organization/report.pdf", file_name: "report.pdf", format: "pdf" },
      error: null,
    });
    const { GET } = await import("@/app/api/template-exports/[exportId]/download/route");
    const response = await GET(new Request("http://localhost"), { params: { exportId } });
    expect(response.status).toBe(404);
    expect(download).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not serve an export if its download audit cannot be recorded", async () => {
    insert.mockResolvedValue({ error: new Error("audit unavailable") });
    const { GET } = await import("@/app/api/template-exports/[exportId]/download/route");
    const response = await GET(new Request("http://localhost"), { params: { exportId } });
    expect(response.status).toBe(500);
  });

  it("rejects a grant export without report permission", async () => {
    getOptionalMemberContext.mockResolvedValue({ ...session, member: { id: "member-1", role: "partner" } });
    const { GET } = await import("@/app/api/grant-platform/export/route");
    const response = await GET();
    expect(response.status).toBe(403);
    expect(getGrantPlatformData).not.toHaveBeenCalled();
  });

  it("does not grant report access to an unknown role", async () => {
    getOptionalMemberContext.mockResolvedValue({ ...session, member: { id: "member-1", role: "unexpected-role" } });
    const { GET } = await import("@/app/api/grant-platform/export/route");
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("exports the saved grant report for an authorized member", async () => {
    const { GET } = await import("@/app/api/grant-platform/export/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(await response.text()).toBe("%PDF-test");
    expect(renderGrantBoardReportPdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ applications: [] }),
      expect.objectContaining({ organizationName: "Olea QA" }),
    );
    expect(getGrantPlatformData).toHaveBeenCalledWith({ requireApplications: true });
  });

  it("fails closed when saved grant applications cannot be loaded", async () => {
    getGrantPlatformData.mockRejectedValue(new Error("grant query failed"));
    const { GET } = await import("@/app/api/grant-platform/export/route");
    const response = await GET();
    expect(response.status).toBe(500);
    expect(renderGrantBoardReportPdfBuffer).not.toHaveBeenCalled();
  });
});
