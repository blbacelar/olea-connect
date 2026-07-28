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
import { MemberForm } from "./member-form";

export function Terms({ data }: { data: RecruitmentData }) {
  const active = data.members.filter((member) => member.active);
  const directors = active.filter((member) => member.memberType === "director");
  const standing = directors.filter(
    (member) => calculateTerm(member, data.workspace).status === "standing",
  );
  const limited = directors.filter(
    (member) => calculateTerm(member, data.workspace).status === "term-limited",
  );
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Roster & succession"
        title="Board Terms"
        description="Maintain the shared board roster and apply your bylaw term rules to every active director."
        action={
          <MemberForm
            data={data}
            trigger={
              <Button>
                <Plus className="size-4" />
                Add member
              </Button>
            }
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Term rules</CardTitle>
          <CardDescription>
            Update these rules in Workspace settings; computed terms use the
            upcoming AGM year.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Continuing"
            value={directors.length - standing.length - limited.length}
            tone="success"
          />
          <StatCard
            label={`Standing at ${data.workspace.upcomingAgmYear}`}
            value={standing.length}
          />
          <StatCard label="Term-limited" value={limited.length} tone="danger" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Executive Committee & officer succession</CardTitle>
          <CardDescription>
            Officer seats are derived from active directors.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(officerLabels)
            .filter(([office]) => office)
            .map(([office, label]) => {
              const holder = directors.find(
                (member) => member.office === office,
              );
              const term = holder
                ? calculateTerm(holder, data.workspace)
                : null;
              return (
                <div key={office} className="rounded-lg border p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 font-semibold">
                    {holder?.fullName ?? "Vacant"}
                  </p>
                  <Badge className="mt-3" variant="outline">
                    {!holder
                      ? "Vacant"
                      : term?.status === "standing"
                        ? "Plan succession"
                        : "Serving"}
                  </Badge>
                </div>
              );
            })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
          <CardDescription>
            Inactive members remain available for audit history but are excluded
            from matrix and term counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type / role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((member) => {
                const term = calculateTerm(member, data.workspace);
                return (
                  <TableRow
                    key={member.id}
                    className={!member.active ? "opacity-60" : undefined}
                  >
                    <TableCell className="font-semibold">
                      {member.fullName}
                      <span className="block text-xs font-normal text-slate-500">
                        {member.email || "No email"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.memberType === "staff" ? (
                        <>
                          <Badge variant="outline">Staff</Badge>
                          <span className="mt-1 block text-xs text-slate-500">
                            {member.roleTitle || "Committee support"}
                          </span>
                        </>
                      ) : (
                        member.roleTitle || "Director"
                      )}
                    </TableCell>
                    <TableCell>{member.dateJoined || "—"}</TableCell>
                    <TableCell>
                      {term.status === "staff"
                        ? "Committees only"
                        : term.endYear
                          ? `Term ${term.termNumber} · ends ${term.endYear}`
                          : "Add join date"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          member.active &&
                            "border-green-200 bg-green-50 text-green-800",
                          !member.active && "border-slate-300",
                        )}
                      >
                        {member.active
                          ? term.status === "term-limited"
                            ? "Term-limited"
                            : term.status === "standing"
                              ? "Standing for election"
                              : "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <MemberForm
                          data={data}
                          member={member}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${member.fullName}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <form action={toggleRecruitmentMember}>
                          <HiddenWorkspace data={data} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={member.id}
                          />
                          <input
                            type="hidden"
                            name="active"
                            value={String(member.active)}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              member.active
                                ? `Deactivate ${member.fullName}`
                                : `Reactivate ${member.fullName}`
                            }
                          >
                            <Archive className="size-4" />
                          </Button>
                        </form>
                        <ConfirmAction
                          title={`Delete ${member.fullName}?`}
                          description="This permanently removes the member and their survey responses. Deactivate them instead if you need to preserve audit history."
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${member.fullName}`}
                            >
                              <Trash2 className="size-4 text-red-700" />
                            </Button>
                          }
                          action={deleteRecruitmentMember}
                        >
                          <HiddenWorkspace data={data} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={member.id}
                          />
                        </ConfirmAction>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!data.members.length && (
            <EmptyState>
              Add the first director or staff member to build the roster.
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
