"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardList,
  Mail,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  addRecruitmentSkill,
  createRecruitmentCommittee,
  createRecruitmentMember,
  deleteRecruitmentCommittee,
  deleteRecruitmentMember,
  deleteRecruitmentSkill,
  saveRecruitmentResponse,
  saveRecruitmentSettings,
  sendRecruitmentInvitation,
  sendRecruitmentInvitations,
  setCommitteeChair,
  toggleCommitteeMember,
  toggleRecruitmentMember,
  updateRecruitmentCommittee,
  updateRecruitmentMember,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateTerm,
  coverageLevel,
  officerLabels,
} from "@/lib/board-recruitment/domain";
import type {
  RecruitmentData,
  RecruitmentMember,
  RecruitmentTab,
} from "@/lib/board-recruitment/types";
import { cn } from "@/lib/utils";
import {
  ConfirmAction,
  EmptyState,
  Field,
  HiddenWorkspace,
  ModalForm,
  SectionHeader,
  StatCard,
} from "./shared";
import { answersForMember, invitationFor } from "./helpers";

export function Survey({ data }: { data: RecruitmentData }) {
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
          <form action={sendRecruitmentInvitations}>
            <HiddenWorkspace data={data} />
            <SubmitButton>
              <Mail className="size-4" />
              Send to all not-yet-invited
            </SubmitButton>
          </form>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Distribution status</CardTitle>
          <CardDescription>
            {responded} of {directors.length} active directors responded for{" "}
            {data.workspace.surveyYear}.
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
          <Table>
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
          </Table>
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
                            <span className="text-sm">{skill.name}</span>
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
