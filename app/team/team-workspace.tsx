"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { getRemainingInviteSeatCount } from "@/lib/team/seats";
import type { OrganizationRole, TeamData } from "@/lib/types";

import {
  cancelTeamInvitation,
  inviteTeamMember,
  updateTeamMember,
} from "./actions";
import {
  InviteTeamMemberForm,
  PendingInviteList,
} from "./team-invite-sections";
import {
  MemberList,
  TeamWorkspaceHeader,
} from "./team-workspace-sections";

type TeamMemberUpdate = {
  remove?: boolean;
  role?: OrganizationRole;
  status?: "active" | "suspended";
};

function getInviteErrorMessage(message: string) {
  if (message.includes("already has an Olea Connects account")) {
    return "This email is already registered with Olea Connects™. Invite a new email address, or contact support if this person needs to be moved into your workspace.";
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
  const runMutation = (mutation: () => Promise<unknown>) => {
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

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setSent(false);
    setInviteError("");
  };

  const updateMember = (
    memberId: string,
    payload: TeamMemberUpdate,
  ) => {
    runMutation(() => updateTeamMember(memberId, payload));
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
      <TeamWorkspaceHeader team={team} />

      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      <MemberList
        canManage={team.canManage}
        currentMember={team.currentMember}
        isPending={isPending}
        members={team.members}
        onUpdateMember={updateMember}
      />

      {team.canManage ? (
        <>
          <InviteTeamMemberForm
            email={email}
            inviteError={inviteError}
            inviteRole={inviteRole}
            isPending={isPending}
            remainingInviteSeats={remainingInviteSeats}
            sent={sent}
            onEmailChange={handleEmailChange}
            onInviteRoleChange={setInviteRole}
            onSendInvite={sendInvite}
          />
          <PendingInviteList
            invitations={team.invitations}
            isPending={isPending}
            onCancelInvitation={(inviteId) =>
              runMutation(() => cancelTeamInvitation(inviteId))
            }
          />
        </>
      ) : null}
    </div>
  );
}
