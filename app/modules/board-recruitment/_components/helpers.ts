import type { RecruitmentData } from "@/lib/board-recruitment/types";

export function uninvitedDirectors(data: RecruitmentData) {
  const invited = new Set(data.invitations.map((invitation) => invitation.memberId));
  return data.members.filter((member) => member.active
    && member.memberType === "director"
    && Boolean(member.email.trim())
    && !invited.has(member.id));
}

export {
  activeDirectorHasSkill,
  activeDirectorHolders,
  answersForMember,
  responseFor,
} from "@/lib/board-recruitment/metrics";

export function invitationFor(data: RecruitmentData, memberId: string) {
  return data.invitations.find(
    (invitation) => invitation.memberId === memberId,
  );
}
