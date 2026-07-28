import type { RecruitmentData } from "@/lib/board-recruitment/types";

export function invitationFor(data: RecruitmentData, memberId: string) {
  return data.invitations.find(
    (invitation) => invitation.memberId === memberId,
  );
}

export function responseFor(
  data: RecruitmentData,
  memberId: string,
  skillId: string,
) {
  return (
    data.responses.find(
      (response) =>
        response.memberId === memberId && response.skillId === skillId,
    )?.hasSkill ?? false
  );
}

export function answersForMember(data: RecruitmentData, memberId: string) {
  return Object.fromEntries(
    data.skills.map((skill) => [
      skill.id,
      responseFor(data, memberId, skill.id),
    ]),
  );
}
