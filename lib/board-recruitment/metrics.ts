import type { RecruitmentData } from "./types";

export function responseFor(
  data: RecruitmentData,
  memberId: string,
  skillId: string,
) {
  return (
    data.skillAssignments.some(
      (response) =>
        response.memberId === memberId &&
        response.skillId === skillId &&
        response.hasSkill,
    ) ||
    data.responses.some(
      (response) =>
        response.memberId === memberId &&
        response.skillId === skillId &&
        response.hasSkill,
    )
  );
}

export function assignedSkillIdsForMember(
  data: RecruitmentData,
  memberId: string,
) {
  return data.skillAssignments
    .filter(
      (assignment) => assignment.memberId === memberId && assignment.hasSkill,
    )
    .map((assignment) => assignment.skillId);
}

export function activeDirectorHolders(data: RecruitmentData, skillId: string) {
  return data.members.filter(
    (member) =>
      member.active &&
      member.memberType === "director" &&
      responseFor(data, member.id, skillId),
  );
}

export function activeDirectorHasSkill(data: RecruitmentData, skillId: string) {
  return activeDirectorHolders(data, skillId).length > 0;
}

export function answersForMember(data: RecruitmentData, memberId: string) {
  return Object.fromEntries(
    data.skills.map((skill) => [
      skill.id,
      data.responses.find(
        (response) =>
          response.memberId === memberId && response.skillId === skill.id,
      )?.hasSkill ?? false,
    ]),
  );
}
