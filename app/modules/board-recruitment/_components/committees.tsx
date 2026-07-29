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
      {data.committees.map((committee) => {
        const assignments = active.filter((member) =>
          committee.memberIds.includes(member.id),
        );
        return (
          <Card
            key={committee.id}
            data-testid={`committee-card-${committee.id}`}
          >
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>{committee.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      assignments.length === 0
                        ? "border-red-200 bg-red-50 text-red-800"
                        : !committee.chairId
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-green-200 bg-green-50 text-green-800"
                    }
                  >
                    {assignments.length === 0
                      ? "No members"
                      : !committee.chairId
                        ? "Needs a chair"
                        : `${assignments.length} member(s)`}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <ModalForm
                    title="Rename committee"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${committee.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                    action={updateRecruitmentCommittee}
                  >
                    <HiddenWorkspace data={data} />
                    <input
                      type="hidden"
                      name="committeeId"
                      value={committee.id}
                    />
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
                    <input
                      type="hidden"
                      name="committeeId"
                      value={committee.id}
                    />
                  </ConfirmAction>
                </div>
              </div>
              <CardDescription>
                {committee.chairId
                  ? `Chair: ${active.find((member) => member.id === committee.chairId)?.fullName ?? "Unknown"}`
                  : "Assign members and choose a chair."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {active.map((member) => {
                  const assigned = committee.memberIds.includes(member.id);
                  return (
                    <form key={member.id} action={toggleCommitteeMember}>
                      <HiddenWorkspace data={data} />
                      <input
                        type="hidden"
                        name="committeeId"
                        value={committee.id}
                      />
                      <input type="hidden" name="memberId" value={member.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={assigned ? "default" : "outline"}
                        className="min-h-10"
                        aria-pressed={assigned}
                      >
                        {assigned && <Check className="size-4" />}
                        {member.fullName}
                        {member.memberType === "staff" && (
                          <span className="text-xs opacity-70">Staff</span>
                        )}
                      </Button>
                    </form>
                  );
                })}
              </div>
              {assignments.length > 0 && (
                <form
                  action={setCommitteeChair}
                  className="flex max-w-md items-end gap-3"
                >
                  <HiddenWorkspace data={data} />
                  <input
                    type="hidden"
                    name="committeeId"
                    value={committee.id}
                  />
                  <label className="flex-1 space-y-1.5 text-sm font-semibold text-slate-700">
                    <span>Committee chair</span>
                    <Select
                      name="memberId"
                      defaultValue={committee.chairId ?? undefined}
                    >
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
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
