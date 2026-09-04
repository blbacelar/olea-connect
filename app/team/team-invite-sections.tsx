"use client";

import { Check, Send, UserPlus } from "lucide-react";

import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamData } from "@/lib/types";

type TeamInvitation = TeamData["invitations"][number];

export function InviteTeamMemberForm({
  email,
  inviteError,
  inviteRole,
  isPending,
  remainingInviteSeats,
  sent,
  onEmailChange,
  onInviteRoleChange,
  onSendInvite,
}: {
  email: string;
  inviteError: string;
  inviteRole: "admin" | "member";
  isPending: boolean;
  remainingInviteSeats: number;
  sent: boolean;
  onEmailChange: (value: string) => void;
  onInviteRoleChange: (role: "admin" | "member") => void;
  onSendInvite: () => void;
}) {
  return (
    <>
      <SectionHeading>Invite a team member</SectionHeading>
      <div className="mb-3 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.currentTarget.value)}
          onInput={(event) => onEmailChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSendInvite();
          }}
          placeholder="name@organization.ca"
          aria-label="Team member email"
        />
        <Select value={inviteRole} onValueChange={onInviteRoleChange}>
          <SelectTrigger className="h-11 bg-white sm:w-36" aria-label="Invite role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button
          data-testid="send-invite"
          onClick={onSendInvite}
          disabled={!email.trim() || isPending || remainingInviteSeats === 0}
        >
          {sent ? <Check className="size-4" /> : <Send className="size-4" />}
          {isPending ? "Sending..." : sent ? "Invite sent" : "Send invite"}
        </Button>
      </div>
      {inviteError ? (
        <div
          role="alert"
          className="mb-3 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-semibold">Invite not sent</p>
          <p className="mt-1 leading-6">{inviteError}</p>
        </div>
      ) : null}
      <p className="mb-8 text-sm text-slate-500">
        {remainingInviteSeats > 0
          ? `${remainingInviteSeats} invite slot${
              remainingInviteSeats === 1 ? "" : "s"
            } remaining. Invitations expire after 7 days.`
          : "No invite slots remain. Revoke an invitation or add a seat before inviting someone."}
      </p>
    </>
  );
}

export function PendingInviteList({
  invitations,
  isPending,
  onCancelInvitation,
}: {
  invitations: TeamInvitation[];
  isPending: boolean;
  onCancelInvitation: (inviteId: string) => void;
}) {
  return (
    <>
      <SectionHeading>Pending invites</SectionHeading>
      <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
        {invitations.length > 0 ? (
          invitations.map((invite) => (
            <PendingInviteRow
              key={invite.id}
              invite={invite}
              isPending={isPending}
              onCancelInvitation={onCancelInvitation}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <UserPlus className="mx-auto size-6 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No pending invites</p>
          </div>
        )}
      </div>
    </>
  );
}

function PendingInviteRow({
  invite,
  isPending,
  onCancelInvitation,
}: {
  invite: TeamInvitation;
  isPending: boolean;
  onCancelInvitation: (inviteId: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Invitation for ${invite.email}`}
      className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[14.5px] font-medium">{invite.email}</p>
          <Badge variant="outline" className="capitalize">
            {invite.role}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12.5px] text-slate-400">
          Invited {formatInviteDate(invite.createdAt)} · expires{" "}
          {formatInviteDate(invite.expiresAt)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-red-200 text-red-600 hover:bg-red-50"
        disabled={isPending}
        onClick={() => onCancelInvitation(invite.id)}
      >
        Cancel
      </Button>
    </div>
  );
}

function formatInviteDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
