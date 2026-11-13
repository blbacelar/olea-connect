import type { Member, OrganizationRole } from "@/lib/types";

export type BoardCalendarRole = "administrator" | "executive" | "chair" | "member";

export function effectiveBoardCalendarRole(input: Pick<Member, "membershipRole" | "boardCalendarRole">): BoardCalendarRole {
  if (input.membershipRole === "owner" || input.membershipRole === "admin") return "administrator";
  return input.boardCalendarRole ?? "member";
}

export function isValidBoardCalendarInvitationRole(teamRole: Exclude<OrganizationRole, "owner">, calendarRole: BoardCalendarRole) {
  return teamRole === "admin" ? calendarRole === "administrator" : calendarRole !== "administrator";
}

export function canManageBoardCalendar(role: BoardCalendarRole) {
  return role === "administrator";
}

export function canEditBoardCalendarDocuments(role: BoardCalendarRole) {
  return role === "administrator" || role === "chair";
}

export function canViewBoardCalendarMeetingsAndWorkflows(role: BoardCalendarRole) {
  return role === "administrator" || role === "executive";
}

export function canUpdateBoardCalendarTaskStatus(role: BoardCalendarRole) {
  return role === "administrator" || role === "executive";
}

export function boardCalendarRoleLabel(role: BoardCalendarRole, french = false) {
  const labels = french
    ? { administrator: "Administration du calendrier", executive: "Direction générale / opérations", chair: "Présidence de comité", member: "Membre du conseil" }
    : { administrator: "Calendar Administrator", executive: "Executive Director / COO", chair: "Committee Chair", member: "Board Member" };
  return labels[role];
}
