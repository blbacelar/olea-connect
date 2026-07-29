import type { RecruitmentData } from "@/lib/board-recruitment/types";

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
