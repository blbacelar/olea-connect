"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import {
  createRecruitmentCommittee,
  deleteRecruitmentCommittee,
  setCommitteeChair,
  toggleCommitteeMember,
  updateRecruitmentCommittee,
} from "@/app/modules/board-recruitment/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RecruitmentData } from "@/lib/board-recruitment/types";

import {
  ConfirmAction,
  Field,
  HiddenWorkspace,
  ModalForm,
  SectionHeader,
} from "./shared";

export function Committees({ data }: { data: RecruitmentData }) {
  const active = data.members.filter((member) => member.active);
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Board structure"
        title="Committees"
        description="Create committees, assign directors and staff, and designate one chair per committee."
        action={
          <ModalForm
            title="Add committee"
            trigger={
              <Button>
                <Plus className="size-4" />
                Add committee
              </Button>
            }
            action={createRecruitmentCommittee}
          >
            <HiddenWorkspace data={data} />
            <Field
              label="Committee name"
              name="name"
              placeholder="Audit committee"
              required
            />
          </ModalForm>
        }
      />
      {data.committees.map((committee) => (
        <CommitteeCard
          key={committee.id}
          activeMembers={active}
          committee={committee}
          data={data}
        />
      ))}
    </div>
  );
}

function CommitteeCard({
  activeMembers,
  committee,
  data,
}: {
  activeMembers: RecruitmentData["members"];
  committee: RecruitmentData["committees"][number];
  data: RecruitmentData;
}) {
  const assignments = activeMembers.filter((member) =>
    committee.memberIds.includes(member.id),
  );

  return (
    <Card data-testid={`committee-card-${committee.id}`}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{committee.name}</CardTitle>
            <CommitteeStatusBadge committee={committee} count={assignments.length} />
          </div>
          <CommitteeActions committee={committee} data={data} />
        </div>
        <CardDescription>
          {committee.chairId
            ? `Chair: ${activeMembers.find((member) => member.id === committee.chairId)?.fullName ?? "Unknown"}`
            : "Assign members and choose a chair."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {activeMembers.map((member) => (
            <CommitteeMemberToggle
              key={member.id}
              assigned={committee.memberIds.includes(member.id)}
              committeeId={committee.id}
              data={data}
              member={member}
            />
          ))}
        </div>
        {assignments.length > 0 ? (
          <CommitteeChairForm
            assignments={assignments}
            committee={committee}
            data={data}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CommitteeStatusBadge({
  committee,
  count,
}: {
  committee: RecruitmentData["committees"][number];
  count: number;
}) {
  return (
    <Badge variant="outline" className={getCommitteeStatusClass(committee, count)}>
      {getCommitteeStatusLabel(committee, count)}
    </Badge>
  );
}

function CommitteeActions({
  committee,
  data,
}: {
  committee: RecruitmentData["committees"][number];
  data: RecruitmentData;
}) {
  return (
    <div className="flex gap-1">
      <ModalForm
        title="Rename committee"
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Edit ${committee.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
        action={updateRecruitmentCommittee}
      >
        <HiddenWorkspace data={data} />
        <input type="hidden" name="committeeId" value={committee.id} />
        <Field
          label="Committee name"
          name="name"
          defaultValue={committee.name}
          required
        />
      </ModalForm>
      <ConfirmAction
        title={`Delete ${committee.name}?`}
        description="This removes the committee and its member assignments from the recruitment workspace."
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${committee.name}`}
          >
            <Trash2 className="size-4 text-red-700" />
          </Button>
        }
        action={deleteRecruitmentCommittee}
      >
        <HiddenWorkspace data={data} />
        <input type="hidden" name="committeeId" value={committee.id} />
      </ConfirmAction>
    </div>
  );
}

function CommitteeMemberToggle({
  assigned,
  committeeId,
  data,
  member,
}: {
  assigned: boolean;
  committeeId: string;
  data: RecruitmentData;
  member: RecruitmentData["members"][number];
}) {
  return (
    <form action={toggleCommitteeMember}>
      <HiddenWorkspace data={data} />
      <input type="hidden" name="committeeId" value={committeeId} />
      <input type="hidden" name="memberId" value={member.id} />
      <Button
        type="submit"
        size="sm"
        variant={assigned ? "default" : "outline"}
        className="min-h-10"
        aria-pressed={assigned}
      >
        {assigned ? <Check className="size-4" /> : null}
        {member.fullName}
        {member.memberType === "staff" ? (
          <span className="text-xs opacity-70">Staff</span>
        ) : null}
      </Button>
    </form>
  );
}

function CommitteeChairForm({
  assignments,
  committee,
  data,
}: {
  assignments: RecruitmentData["members"];
  committee: RecruitmentData["committees"][number];
  data: RecruitmentData;
}) {
  return (
    <form action={setCommitteeChair} className="flex max-w-md items-end gap-3">
      <HiddenWorkspace data={data} />
      <input type="hidden" name="committeeId" value={committee.id} />
      <label className="flex-1 space-y-1.5 text-sm font-semibold text-slate-700">
        <span>Committee chair</span>
        <Select name="memberId" defaultValue={committee.chairId ?? undefined}>
          <SelectTrigger aria-label={`Chair for ${committee.name}`}>
            <SelectValue placeholder="Choose a chair" />
          </SelectTrigger>
          <SelectContent>
            {assignments.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <SubmitButton variant="outline">Save chair</SubmitButton>
    </form>
  );
}

function getCommitteeStatusClass(
  committee: RecruitmentData["committees"][number],
  count: number,
) {
  if (count === 0) return "border-red-200 bg-red-50 text-red-800";
  if (!committee.chairId) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-green-200 bg-green-50 text-green-800";
}

function getCommitteeStatusLabel(
  committee: RecruitmentData["committees"][number],
  count: number,
) {
  if (count === 0) return "No members";
  return committee.chairId ? `${count} member(s)` : "Needs a chair";
}
