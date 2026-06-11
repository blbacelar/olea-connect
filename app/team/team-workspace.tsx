"use client";

import { Check, Plus, Send, UserPlus } from "lucide-react";
import { useState } from "react";

import { DemoActionButton } from "@/components/DemoActionButton";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Member, Organization } from "@/lib/types";

export function TeamWorkspace({
  member,
  organization,
}: {
  member: Member;
  organization: Organization;
}) {
  const [email, setEmail] = useState("");
  const [pendingInvites, setPendingInvites] = useState([
    { email: "finance@jpcentre.ca", when: "Invited June 10" },
  ]);
  const [sent, setSent] = useState(false);

  const sendInvite = () => {
    const normalized = email.trim();
    if (!normalized) return;
    setPendingInvites((current) => [
      ...current,
      { email: normalized, when: "Invited just now" },
    ]);
    setEmail("");
    setSent(true);
  };

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite colleagues to collaborate on your governance documents."
        action={
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[13.5px] text-slate-500">
              Using{" "}
              <strong className="text-slate-800">
                {organization.seatsUsed} of {organization.seatLimit}
              </strong>{" "}
              seats
            </span>
            <DemoActionButton
              message="A new team seat has been added."
              variant="outline"
              size="sm"
              className="border-olea-green text-olea-green"
            >
              <Plus className="size-4" />
              Add a seat — $10/mo
            </DemoActionButton>
          </div>
        }
      />

      <div className="mb-7 overflow-hidden rounded-xl border bg-white shadow-soft">
        <div className="flex flex-wrap items-center gap-3.5 px-[22px] py-[18px]">
          <span className="grid size-[42px] place-items-center rounded-full bg-gradient-to-br from-olea-green to-olea-dark text-sm font-bold text-white">
            SM
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold">{member.name}</p>
              <span className="rounded-full bg-olea-light px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-olea-dark">
                Admin
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {member.role} · {member.email}
            </p>
          </div>
          <span className="text-[12.5px] text-slate-400">
            Active since June 2026
          </span>
        </div>
      </div>

      <SectionHeading>Invite a team member</SectionHeading>
      <div className="mb-7 flex max-w-xl flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSent(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendInvite();
          }}
          placeholder="name@organization.ca"
          aria-label="Team member email"
        />
        <Button onClick={sendInvite} disabled={!email.trim()}>
          {sent ? <Check className="size-4" /> : <Send className="size-4" />}
          {sent ? "Invite sent" : "Send invite"}
        </Button>
      </div>

      <SectionHeading>Pending invites</SectionHeading>
      <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
        {pendingInvites.length > 0 ? (
          pendingInvites.map((invite) => (
            <div
              key={invite.email}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
            >
              <div>
                <p className="text-[14.5px] font-medium">{invite.email}</p>
                <p className="mt-0.5 text-[12.5px] text-slate-400">
                  {invite.when} · expires in 7 days
                </p>
              </div>
              <div className="flex gap-2">
                <DemoActionButton
                  message={`Invitation resent to ${invite.email}.`}
                  variant="outline"
                  size="sm"
                >
                  Resend
                </DemoActionButton>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() =>
                    setPendingInvites((current) =>
                      current.filter((item) => item.email !== invite.email),
                    )
                  }
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <UserPlus className="mx-auto size-6 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No pending invites</p>
          </div>
        )}
      </div>
    </div>
  );
}
