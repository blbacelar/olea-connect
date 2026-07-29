"use client";

import { Check, Pause, Play, Send, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageHeader } from "@/components/PageHeader";
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
import { getRemainingInviteSeatCount } from "@/lib/team/seats";
import type { OrganizationRole, TeamData } from "@/lib/types";

import {
  cancelTeamInvitation,
  inviteTeamMember,
  updateTeamMember,
} from "./actions";

function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getInviteErrorMessage(message: string) {
  if (message.includes("already has an Olea Connects account")) {
    return "This email is already registered with Olea Connects. Invite a new email address, or contact support if this person needs to be moved into your workspace.";
  }

  return message;
}

export function TeamWorkspace({ team }: { team: TeamData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isPending, startTransition] = useTransition();
  const remainingInviteSeats = getRemainingInviteSeatCount(
    team.organization.seatLimit,
    team.reservedSeatCount,
  );

  const runMutation = (mutation: () => Promise<void>) => {
    startTransition(async () => {
      try {
        setError("");
        await mutation();
        router.refresh();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Unable to update the team.",
        );
      }
    });
  };

  const sendInvite = () => {
    const normalized = email.trim();
    if (!normalized) return;

    startTransition(async () => {
      try {
        setError("");
        setInviteError("");
        const result = await inviteTeamMember(normalized, inviteRole);
        if (!result.ok) {
          setSent(false);
          setInviteError(getInviteErrorMessage(result.message));
          return;
        }

        setEmail("");
        setSent(true);
        router.refresh();
      } catch (inviteError) {
        setSent(false);
        setInviteError(
          getInviteErrorMessage(
            inviteError instanceof Error
              ? inviteError.message
              : "Unable to send this invitation.",
          ),
        );
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite colleagues and manage access to your organization."
        action={
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[13.5px] text-slate-500">
              <strong className="text-slate-800">
                {team.reservedSeatCount} of {team.organization.seatLimit}
              </strong>{" "}
              total seats reserved
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/subscription">Manage seats</Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      <SectionHeading>Members</SectionHeading>
      <div className="mb-8 overflow-hidden rounded-xl border bg-white shadow-soft">
        {(team.canManage ? team.members : [team.currentMember]).map((member) => {
          const isCurrentMember = member.id === team.currentMember.id;
          const membershipRole =
            "membershipRole" in member ? member.membershipRole : member.role;
          const status = "status" in member ? member.status : "active";
          const name = member.name;

          return (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
            >
              <span className="grid size-[42px] place-items-center rounded-full bg-gradient-to-br from-olea-green to-olea-dark text-sm font-bold text-white">
                {memberInitials(name)}
              </span>
              <div className="min-w-[180px] flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold">{name}</p>
                  {isCurrentMember ? (
                    <Badge variant="outline">You</Badge>
                  ) : null}
                  {status === "suspended" ? (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                      Suspended
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {member.email}
                </p>
              </div>

              {team.canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={membershipRole}
                    disabled={
                      isPending ||
                      (team.currentMember.membershipRole === "admin" &&
                        membershipRole === "owner")
                    }
                    onValueChange={(role: OrganizationRole) =>
                      runMutation(() =>
                        updateTeamMember(member.id, { role }),
                      )
                    }
                  >
                    <SelectTrigger
                      className="w-32 bg-white"
                      aria-label={`Role for ${name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {team.currentMember.membershipRole === "owner" ? (
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
                      runMutation(() =>
                        updateTeamMember(member.id, {
                          status:
                            status === "suspended" ? "active" : "suspended",
                        }),
                      )
                    }
                  >
                    {status === "suspended" ? (
                      <Play className="size-4" />
                    ) : (
                      <Pause className="size-4" />
                    )}
                    {status === "suspended" ? "Reactivate" : "Suspend"}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Remove ${name}`}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    disabled={isPending || isCurrentMember}
                    onClick={() =>
                      runMutation(() =>
                        updateTeamMember(member.id, { remove: true }),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {membershipRole}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {team.canManage ? (
        <>
          <SectionHeading>Invite a team member</SectionHeading>
          <div className="mb-3 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                setSent(false);
                setInviteError("");
              }}
              onInput={(event) => {
                setEmail(event.currentTarget.value);
                setSent(false);
                setInviteError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendInvite();
              }}
              placeholder="name@organization.ca"
              aria-label="Team member email"
            />
            <Select
              value={inviteRole}
              onValueChange={(role: "admin" | "member") =>
                setInviteRole(role)
              }
            >
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
              onClick={sendInvite}
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

          <SectionHeading>Pending invites</SectionHeading>
          <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
            {team.invitations.length > 0 ? (
              team.invitations.map((invite) => (
                <div
                  key={invite.id}
                  role="group"
                  aria-label={`Invitation for ${invite.email}`}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14.5px] font-medium">
                        {invite.email}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {invite.role}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-slate-400">
                      Invited{" "}
                      {new Intl.DateTimeFormat("en-CA", {
                        dateStyle: "medium",
                      }).format(new Date(invite.createdAt))}{" "}
                      · expires{" "}
                      {new Intl.DateTimeFormat("en-CA", {
                        dateStyle: "medium",
                      }).format(new Date(invite.expiresAt))}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    disabled={isPending}
                    onClick={() =>
                      runMutation(() => cancelTeamInvitation(invite.id))
                    }
                  >
                    Cancel
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <UserPlus className="mx-auto size-6 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  No pending invites
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
