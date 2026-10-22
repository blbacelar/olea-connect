"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrganizationRole, TeamData } from "@/lib/types";

type TeamMember = TeamData["members"][number];
type TeamMemberUpdate = {
  remove?: boolean;
  role?: OrganizationRole;
  status?: "active" | "suspended";
};

function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TeamWorkspaceHeader({ team }: { team: TeamData }) {
  return (
    <PageHeader
      title="Team"
      description={
        team.canManage
          ? "Invite colleagues and manage access to your organization."
          : "View the members of your organization."
      }
      action={
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[13.5px] text-slate-500">
            <strong className="text-slate-800">
              {team.reservedSeatCount} of {team.organization.seatLimit}
            </strong>{" "}
            total seats reserved
          </span>
          {team.canManage ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/subscription">Manage seats</Link>
            </Button>
          ) : null}
        </div>
      }
    />
  );
}

export function MemberList({
  currentMember,
  isPending,
  members,
  canManage,
  onUpdateMember,
}: {
  canManage: boolean;
  currentMember: TeamData["currentMember"];
  isPending: boolean;
  members: TeamMember[];
  onUpdateMember: (memberId: string, payload: TeamMemberUpdate) => void;
}) {
  return (
    <>
      <SectionHeading>Members</SectionHeading>
      <div className="mb-8 overflow-hidden rounded-xl border bg-white shadow-soft">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            canManage={canManage}
            currentMember={currentMember}
            isPending={isPending}
            member={member}
            onUpdateMember={onUpdateMember}
          />
        ))}
      </div>
    </>
  );
}

function MemberRow({
  canManage,
  currentMember,
  isPending,
  member,
  onUpdateMember,
}: {
  canManage: boolean;
  currentMember: TeamData["currentMember"];
  isPending: boolean;
  member: TeamMember;
  onUpdateMember: (memberId: string, payload: TeamMemberUpdate) => void;
}) {
  const isCurrentMember = member.id === currentMember.id;

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0">
      <span className="grid size-[42px] place-items-center rounded-full bg-gradient-to-br from-olea-green to-olea-dark text-sm font-bold text-white">
        {memberInitials(member.name)}
      </span>
      <div className="min-w-[180px] flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-semibold">{member.name}</p>
          {isCurrentMember ? <Badge variant="outline">You</Badge> : null}
          {member.status === "suspended" ? (
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">
              Suspended
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-[13px] text-slate-500">{member.email}</p>
      </div>

      {canManage ? (
        <MemberActions
          currentMember={currentMember}
          isCurrentMember={isCurrentMember}
          isPending={isPending}
          member={member}
          onUpdateMember={onUpdateMember}
        />
      ) : (
        <Badge variant="outline" className="capitalize">
          {member.role}
        </Badge>
      )}
    </div>
  );
}

function MemberActions({
  currentMember,
  isCurrentMember,
  isPending,
  member,
  onUpdateMember,
}: {
  currentMember: TeamData["currentMember"];
  isCurrentMember: boolean;
  isPending: boolean;
  member: TeamMember;
  onUpdateMember: (memberId: string, payload: TeamMemberUpdate) => void;
}) {
  const cannotEditOwner =
    currentMember.membershipRole === "admin" && member.role === "owner";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={member.role}
        disabled={isPending || cannotEditOwner}
        onValueChange={(role: OrganizationRole) =>
          onUpdateMember(member.id, { role })
        }
      >
        <SelectTrigger
          className="w-32 bg-white"
          aria-label={`Role for ${member.name}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currentMember.membershipRole === "owner" ? (
            <SelectItem value="owner">Owner</SelectItem>
          ) : null}
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="member">Member</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        disabled={isPending || isCurrentMember}
        onClick={() =>
          onUpdateMember(member.id, {
            status: member.status === "suspended" ? "active" : "suspended",
          })
        }
      >
        {member.status === "suspended" ? (
          <Play className="size-4" />
        ) : (
          <Pause className="size-4" />
        )}
        {member.status === "suspended" ? "Reactivate" : "Suspend"}
      </Button>

      <Button
        variant="outline"
        size="icon"
        aria-label={`Remove ${member.name}`}
        className="border-red-200 text-red-600 hover:bg-red-50"
        disabled={isPending || isCurrentMember}
        onClick={() => onUpdateMember(member.id, { remove: true })}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
