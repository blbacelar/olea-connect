import type {
  TemplateFormData,
  WorkspaceMemberOption,
} from "./types";

type TemplateRecord = Record<string, unknown>;

function isRecord(value: unknown): value is TemplateRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getMemberDisplayName(member: WorkspaceMemberOption) {
  return member.name.trim() || member.email;
}

function findMember(
  members: WorkspaceMemberOption[],
  memberId: string,
  savedLabel: string,
) {
  if (memberId) {
    return members.find((member) => member.id === memberId) ?? null;
  }

  const normalizedLabel = savedLabel.toLocaleLowerCase();
  const matches = members.filter((member) => {
    const displayName = getMemberDisplayName(member).toLocaleLowerCase();
    return (
      displayName === normalizedLabel ||
      member.email.toLocaleLowerCase() === normalizedLabel
    );
  });

  return matches.length === 1 ? matches[0] : null;
}

function normalizeChair(
  record: TemplateRecord,
  members: WorkspaceMemberOption[],
  label: string,
) {
  const savedLabel = getString(record.chair);
  const memberId = getString(record.chair_user_id);

  if (!savedLabel && !memberId) {
    return {
      ...record,
      chair: "",
      chair_user_id: "",
    };
  }

  const member = findMember(members, memberId, savedLabel);
  if (!member) {
    throw new Error(
      `${label} must be assigned to an active workspace member. Choose a member from the directory.`,
    );
  }

  return {
    ...record,
    chair: getMemberDisplayName(member),
    chair_user_id: member.id,
  };
}

function normalizeAdministrator(
  formData: TemplateFormData,
  members: WorkspaceMemberOption[],
) {
  const savedName = getString(formData.administrator);
  const savedEmail = getString(formData.administrator_email);
  const memberId = getString(formData.administrator_user_id);

  if (!savedName && !memberId) {
    return {
      administrator: "",
      administrator_email: "",
      administrator_user_id: "",
    };
  }

  const member = memberId
    ? findMember(members, memberId, savedName)
    : findMember(members, "", savedName) ??
      findMember(members, "", savedEmail);
  if (!member) {
    throw new Error(
      "Administrator must be assigned to an active workspace member. Choose a member from the directory.",
    );
  }

  return {
    administrator: getMemberDisplayName(member),
    administrator_email: member.email,
    administrator_user_id: member.id,
  };
}

/**
 * Converts legacy Board Calendar people assignments to active workspace member
 * IDs and rejects data that cannot be tied to the current organization.
 */
export function normalizeBoardCalendarMemberAssignments(
  formData: TemplateFormData,
  members: WorkspaceMemberOption[],
): TemplateFormData {
  const administrator = normalizeAdministrator(formData, members);
  const boardChair = normalizeChair(
    {
      chair: formData.board_chair,
      chair_user_id: formData.board_chair_user_id,
    },
    members,
    "Board Chair",
  );
  const committees = Array.isArray(formData.committees)
    ? formData.committees.map((committee, index) =>
        isRecord(committee)
          ? normalizeChair(committee, members, `Committee ${index + 1} chair`)
          : committee,
      )
    : formData.committees;

  return {
    ...formData,
    ...administrator,
    board_chair: boardChair.chair as string,
    board_chair_user_id: boardChair.chair_user_id as string,
    committees,
  };
}

export function getWorkspaceMemberDisplayName(member: WorkspaceMemberOption) {
  return getMemberDisplayName(member);
}
