import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();
const attemptUserWorkspaceProvisioning = vi.fn();
const createAdminClient = vi.fn();
const getPostActivationPath = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession,
      getUser,
    },
  })),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient,
}));

vi.mock("@/lib/stripe/registration", () => ({
  attemptUserWorkspaceProvisioning,
}));

vi.mock("@/lib/onboarding/post-activation", () => ({
  getPostActivationPath,
}));

describe("auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { id: "user_123" } } });
    createAdminClient.mockReturnValue({ admin: true });
    getPostActivationPath.mockResolvedValue("/onboarding/brand-setup");
  });

  it("sends password recovery links to the password update screen", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      new Request(
        "https://staging.oleaconnects.com/auth/callback?code=valid-code&next=/update-password",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://staging.oleaconnects.com/update-password",
    );
    expect(attemptUserWorkspaceProvisioning).not.toHaveBeenCalled();
  });

  it("keeps provisioning behavior for normal signup verification callbacks", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    attemptUserWorkspaceProvisioning.mockResolvedValue({ status: "completed" });

    const response = await GET(
      new Request("https://staging.oleaconnects.com/auth/callback?code=valid-code"),
    );

    expect(response.headers.get("location")).toBe(
      "https://staging.oleaconnects.com/onboarding/brand-setup",
    );
    expect(attemptUserWorkspaceProvisioning).toHaveBeenCalledWith(
      { admin: true },
      "user_123",
    );
    expect(getPostActivationPath).toHaveBeenCalledWith(
      { admin: true },
      undefined,
    );
  });

  it("redirects completed returning users to the resolved post-activation path", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    attemptUserWorkspaceProvisioning.mockResolvedValue({
      status: "completed",
      organization_id: "org_123",
    });
    getPostActivationPath.mockResolvedValue("/dashboard");

    const response = await GET(
      new Request("https://staging.oleaconnects.com/auth/callback?code=valid-code"),
    );

    expect(response.headers.get("location")).toBe(
      "https://staging.oleaconnects.com/dashboard",
    );
    expect(getPostActivationPath).toHaveBeenCalledWith(
      { admin: true },
      "org_123",
    );
  });
});
