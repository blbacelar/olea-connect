import { describe, expect, it } from "vitest";

import { canAccessGrantPlatform, getGrantPlatformActionAccess, grantPlatformPermissionMatrix, normalizeGrantPlatformRole } from "@/lib/grants/permissions";

describe("grant platform permissions", () => {
  it("matches the documented matrix for each role", () => {
    expect(grantPlatformPermissionMatrix.admin.editGrants).toBe(true);
    expect(grantPlatformPermissionMatrix.grant_manager.editBudgets).toBe(false);
    expect(grantPlatformPermissionMatrix.finance.viewBudgets).toBe(true);
    expect(grantPlatformPermissionMatrix.partner.viewAllGrants).toBe(false);
    expect(grantPlatformPermissionMatrix.viewer.viewReports).toBe(true);
  });

  it("allows role lookups to resolve the supported values", () => {
    expect(normalizeGrantPlatformRole("grant_manager")).toBe("grant_manager");
    expect(normalizeGrantPlatformRole("finance")).toBe("finance");
    expect(normalizeGrantPlatformRole("owner")).toBe("admin");
    expect(normalizeGrantPlatformRole("member")).toBe("partner");
    expect(normalizeGrantPlatformRole("unknown")).toBe("admin");
  });

  it("returns the correct permission flags for each role", () => {
    expect(canAccessGrantPlatform("admin", "manageTeam")).toBe(true);
    expect(canAccessGrantPlatform("grant_manager", "viewReports")).toBe(true);
    expect(canAccessGrantPlatform("finance", "editGrants")).toBe(false);
    expect(canAccessGrantPlatform("partner", "editBudgets")).toBe(false);
    expect(canAccessGrantPlatform("viewer", "viewAllGrants")).toBe(true);
  });

  it("exposes the action-level access flags used by the server actions", () => {
    expect(getGrantPlatformActionAccess("partner").canCreateRounds).toBe(false);
    expect(getGrantPlatformActionAccess("partner").canManageWorkflow).toBe(true);
    expect(getGrantPlatformActionAccess("viewer").canManageWorkflow).toBe(false);
  });
});
