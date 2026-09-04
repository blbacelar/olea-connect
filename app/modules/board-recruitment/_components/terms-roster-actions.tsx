"use client";

import { Archive, Pencil, Trash2 } from "lucide-react";

import {
  deleteRecruitmentMember,
  toggleRecruitmentMember,
} from "@/app/modules/board-recruitment/actions";
import { Button } from "@/components/ui/button";
import type { RecruitmentData } from "@/lib/board-recruitment/types";

import { MemberForm } from "./member-form";
import { ConfirmAction, HiddenWorkspace } from "./shared";

type RecruitmentMember = RecruitmentData["members"][number];

export function RosterActions({
  data,
  member,
}: {
  data: RecruitmentData;
  member: RecruitmentMember;
}) {
  return (
    <div className="flex justify-end gap-1">
      <MemberForm
        data={data}
        member={member}
        trigger={
          <Button
            aria-label={`Edit ${member.fullName}`}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ToggleMemberForm data={data} member={member} />
      <DeleteMemberAction data={data} member={member} />
    </div>
  );
}

function ToggleMemberForm({
  data,
  member,
}: {
  data: RecruitmentData;
  member: RecruitmentMember;
}) {
  return (
    <form action={toggleRecruitmentMember}>
      <HiddenWorkspace data={data} />
      <input type="hidden" name="memberId" value={member.id} />
      <input type="hidden" name="active" value={String(member.active)} />
      <Button
        aria-label={
          member.active
            ? `Deactivate ${member.fullName}`
            : `Reactivate ${member.fullName}`
        }
        size="icon"
        type="submit"
        variant="ghost"
      >
        <Archive className="size-4" />
      </Button>
    </form>
  );
}

function DeleteMemberAction({
  data,
  member,
}: {
  data: RecruitmentData;
  member: RecruitmentMember;
}) {
  return (
    <ConfirmAction
      title={`Delete ${member.fullName}?`}
      description="This permanently removes the member and their survey responses. Deactivate them instead if you need to preserve audit history."
      trigger={
        <Button
          aria-label={`Delete ${member.fullName}`}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4 text-red-700" />
        </Button>
      }
      action={deleteRecruitmentMember}
    >
      <HiddenWorkspace data={data} />
      <input type="hidden" name="memberId" value={member.id} />
    </ConfirmAction>
  );
}
