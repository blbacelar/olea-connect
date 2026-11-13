"use client";

import { Check, Mail } from "lucide-react";
import * as React from "react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import {
  saveRecruitmentResponse,
  sendRecruitmentInvitation,
  sendRecruitmentInvitations,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { answersForMember } from "@/lib/board-recruitment/metrics";
import type { RecruitmentData } from "@/lib/board-recruitment/types";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  HiddenWorkspace,
  SectionHeader,
} from "./shared";
import { invitationFor, uninvitedDirectors } from "./helpers";

export function Survey({ data }: { data: RecruitmentData }) {
  const french = useLocaleContext().locale === "fr-CA";
  const [memberId, setMemberId] = React.useState(
    data.members.find(
      (member) => member.memberType === "director" && member.active,
    )?.id ?? "",
  );
  const member = data.members.find((item) => item.id === memberId);
  const [answers, setAnswers] = React.useState<Record<string, boolean>>(() =>
    memberId ? answersForMember(data, memberId) : {},
  );
  const directors = data.members.filter(
    (item) => item.memberType === "director" && item.active,
  );
  const pendingInvitations = uninvitedDirectors(data);
  const invitationGuidance = directors.length === 0
    ? french ? "Ajoutez un administrateur actif dans les mandats du conseil pour envoyer le sondage." : "Add an active director in Board Terms before sending the survey."
    : directors.every((director) => !director.email.trim())
      ? french ? "Ajoutez une adresse courriel dans les mandats du conseil avant d'envoyer le sondage." : "Add an email address in Board Terms before sending the survey."
      : french ? "Tous les administrateurs admissibles ont déjà été invités ou ont répondu." : "All eligible directors have already been invited or responded.";
  const responded = data.invitations.filter(
    (item) => item.status === "responded",
  ).length;
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Secure member survey"
        title="Survey & Send"
        description="Invite active directors to complete the annual skills survey. Staff are excluded automatically; responded invitations never regress."
        action={
          <div className="space-y-2">
            <form action={sendRecruitmentInvitations}>
              <HiddenWorkspace data={data} />
              <SubmitButton disabled={pendingInvitations.length === 0}>
                <Mail className="size-4" />
                Send to all not-yet-invited
              </SubmitButton>
            </form>
            {pendingInvitations.length === 0 && directors.length > 0 ? (
              <div className="max-w-64 text-sm text-slate-600" role="status">
                <p>{invitationGuidance}</p>
                {directors.length === 0 || directors.every((director) => !director.email.trim()) ? (
                  <Button asChild variant="link" size="sm" className="h-auto px-0">
                    <a href="/modules/board-recruitment?tab=terms">{french ? "Ouvrir les mandats du conseil" : "Open Board Terms"}</a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Distribution status</CardTitle>
          <CardDescription>
            {french
              ? `${responded} administrateurs actifs sur ${directors.length} ont répondu pour ${data.workspace.surveyYear}.`
              : `${responded} of ${directors.length} active directors responded for ${data.workspace.surveyYear}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-green-600"
              style={{
                width: `${(responded / Math.max(directors.length, 1)) * 100}%`,
              }}
            />
          </div>
          {directors.length > 0 ? <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directors.map((item) => {
                const invitation = invitationFor(data, item.id);
                const status = invitation?.status ?? "pending";
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">
                      {item.fullName}
                    </TableCell>
                    <TableCell>
                      {item.email || (
                        <span className="text-red-700">
                          Add email in Board Terms
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          status === "responded" &&
                            "border-green-200 bg-green-50 text-green-800",
                          status === "sent" &&
                            "border-amber-200 bg-amber-50 text-amber-800",
                        )}
                      >
                        {status === "responded"
                          ? "Responded"
                          : status === "sent"
                            ? "Invited"
                            : "Not started"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {status === "responded" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberId(item.id)}
                        >
                          View
                        </Button>
                      ) : (
                        <form action={sendRecruitmentInvitation}>
                          <HiddenWorkspace data={data} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={item.id}
                          />
                          <SubmitButton
                            size="sm"
                            variant={status === "sent" ? "outline" : "default"}
                            disabled={!item.email.trim()}
                            title={!item.email.trim() ? (french ? "Ajoutez une adresse courriel dans les mandats du conseil avant d'envoyer le sondage." : "Add an email address in Board Terms before sending the survey.") : undefined}
                            pendingText="Sending..."
                          >
                            <Mail className="size-4" />
                            {status === "sent" ? "Resend" : "Send"}
                          </SubmitButton>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table> : (
            <EmptyState>
              <p>{invitationGuidance}</p>
              <Button asChild variant="link" size="sm" className="mt-2 h-auto">
                <a href="/modules/board-recruitment?tab=terms">{french ? "Ouvrir les mandats du conseil" : "Open Board Terms"}</a>
              </Button>
            </EmptyState>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Member-view preview</CardTitle>
          <CardDescription>
            Preview and record a response for a director while the production
            magic-link flow is connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {member ? (
            <form action={saveRecruitmentResponse} className="space-y-5">
              <HiddenWorkspace data={data} />
              <input type="hidden" name="memberId" value={member.id} />
              <input
                type="hidden"
                name="answers"
                value={JSON.stringify(answers)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold">Preview member</label>
                <Select
                  value={memberId}
                  onValueChange={(value) => {
                    setMemberId(value);
                    setAnswers(answersForMember(data, value));
                  }}
                >
                  <SelectTrigger className="w-64" aria-label="Preview member">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {directors.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {[...new Set(data.skills.map((skill) => skill.categoryName))].map(
                (category) => (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold">{category}</h3>
                    <div className="grid gap-2">
                      {data.skills
                        .filter((skill) => skill.categoryName === category)
                        .map((skill) => (
                          <div
                            key={skill.id}
                            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="text-sm" data-no-translate={skill.isCustom ? "true" : undefined}>{skill.name}</span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  answers[skill.id] === true
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() =>
                                  setAnswers((current) => ({
                                    ...current,
                                    [skill.id]: true,
                                  }))
                                }
                              >
                                Yes
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  answers[skill.id] === false
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() =>
                                  setAnswers((current) => ({
                                    ...current,
                                    [skill.id]: false,
                                  }))
                                }
                              >
                                No
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ),
              )}
              <SubmitButton>
                <Check className="size-4" />
                Submit response
              </SubmitButton>
            </form>
          ) : (
            <EmptyState>
              Add an active director in Board Terms to preview the survey.
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
