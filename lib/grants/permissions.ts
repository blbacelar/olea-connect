export type GrantPlatformPermission =
  | "viewAllGrants"
  | "editGrants"
  | "viewBudgets"
  | "editBudgets"
  | "manageTeam"
  | "viewBoard"
  | "editOrgProfile"
  | "deleteGrants"
  | "viewAllTeamNotes"
  | "editTeamNotes"
  | "viewReports";

export type GrantPlatformRole = "admin" | "grant_manager" | "finance" | "partner" | "viewer";

export const grantPlatformPermissionMatrix: Record<GrantPlatformRole, Record<GrantPlatformPermission, boolean>> = {
  admin: {
    viewAllGrants: true,
    editGrants: true,
    viewBudgets: true,
    editBudgets: true,
    manageTeam: true,
    viewBoard: true,
    editOrgProfile: true,
    deleteGrants: true,
    viewAllTeamNotes: true,
    editTeamNotes: true,
    viewReports: true,
  },
  grant_manager: {
    viewAllGrants: true,
    editGrants: true,
    viewBudgets: true,
    editBudgets: false,
    manageTeam: false,
    viewBoard: true,
    editOrgProfile: false,
    deleteGrants: false,
    viewAllTeamNotes: true,
    editTeamNotes: true,
    viewReports: true,
  },
  finance: {
    viewAllGrants: true,
    editGrants: false,
    viewBudgets: true,
    editBudgets: true,
    manageTeam: false,
    viewBoard: false,
    editOrgProfile: false,
    deleteGrants: false,
    viewAllTeamNotes: true,
    editTeamNotes: false,
    viewReports: true,
  },
  partner: {
    viewAllGrants: false,
    editGrants: false,
    viewBudgets: false,
    editBudgets: false,
    manageTeam: false,
    viewBoard: false,
    editOrgProfile: false,
    deleteGrants: false,
    viewAllTeamNotes: true,
    editTeamNotes: true,
    viewReports: false,
  },
  viewer: {
    viewAllGrants: true,
    editGrants: false,
    viewBudgets: false,
    editBudgets: false,
    manageTeam: false,
    viewBoard: false,
    editOrgProfile: false,
    deleteGrants: false,
    viewAllTeamNotes: true,
    editTeamNotes: false,
    viewReports: true,
  },
};

export function canAccessGrantPlatform(permission: GrantPlatformRole, permissionName: GrantPlatformPermission) {
  return grantPlatformPermissionMatrix[permission][permissionName];
}

export function getGrantPlatformActionAccess(role: string | null | undefined) {
  const normalizedRole = normalizeGrantPlatformRole(role);

  return {
    canCreateRounds: canAccessGrantPlatform(normalizedRole, "editGrants"),
    canManageWorkflow: canAccessGrantPlatform(normalizedRole, "editTeamNotes"),
  };
}

export function getGrantPlatformUiAccess(role: string | null | undefined) {
  const normalizedRole = normalizeGrantPlatformRole(role);

  return {
    canEditGrants: canAccessGrantPlatform(normalizedRole, "editGrants"),
    canEditOrgProfile: canAccessGrantPlatform(normalizedRole, "editOrgProfile"),
    canEditTeamNotes: canAccessGrantPlatform(normalizedRole, "editTeamNotes"),
    canManageTeam: canAccessGrantPlatform(normalizedRole, "manageTeam"),
    canViewBoard: canAccessGrantPlatform(normalizedRole, "viewBoard"),
    canViewBudgets: canAccessGrantPlatform(normalizedRole, "viewBudgets"),
    canViewReports: canAccessGrantPlatform(normalizedRole, "viewReports"),
    normalizedRole,
  };
}

export function normalizeGrantPlatformRole(role: string | null | undefined): GrantPlatformRole {
  const normalizedRole = (role ?? "").trim().toLowerCase();

  switch (normalizedRole) {
    case "finance":
    case "finance_admin":
      return "finance";
    case "partner":
    case "member":
    case "contributor":
      return "partner";
    case "viewer":
    case "read_only":
      return "viewer";
    case "grant_manager":
    case "grants_admin":
      return "grant_manager";
    case "admin":
    case "owner":
    case "super_admin":
    case "community_admin":
    case "consulting_admin":
    case "consultant":
      return "admin";
    default:
      return "admin";
  }
}
