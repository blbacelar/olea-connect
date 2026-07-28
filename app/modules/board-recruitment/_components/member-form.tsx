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

export function MemberForm({
  data,
  member,
  trigger,
}: {
  data: RecruitmentData;
  member?: RecruitmentMember;
  trigger: React.ReactNode;
}) {
  return (
    <ModalForm
      title={member ? "Edit board roster member" : "Add roster member"}
      description="Directors participate in the survey and terms model. Staff can be assigned to committees only."
      trigger={trigger}
      action={member ? updateRecruitmentMember : createRecruitmentMember}
      submitLabel={member ? "Save member" : "Add member"}
    >
      <HiddenWorkspace data={data} />
      {member && <input type="hidden" name="memberId" value={member.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          name="fullName"
          defaultValue={member?.fullName}
          placeholder="Alex Morgan"
          required
        />
        <Field
          label="Role title"
          name="roleTitle"
          defaultValue={member?.roleTitle}
          placeholder="Board Chair"
        />
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          <span>Member type</span>
          <Select
            name="memberType"
            defaultValue={member?.memberType ?? "director"}
          >
            <SelectTrigger aria-label="Member type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="director">Director</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          <span>Officer</span>
          <Select name="office" defaultValue={member?.office || "none"}>
            <SelectTrigger aria-label="Officer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(officerLabels).map(([value, label]) => (
                <SelectItem key={value || "none"} value={value || "none"}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={member?.email}
          placeholder="director@organization.ca"
          hint="Used for the secure survey invitation."
        />
        <Field
          label="Date joined"
          name="dateJoined"
          type="date"
          defaultValue={member?.dateJoined ?? ""}
        />
      </div>
      <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
        <span>Notes</span>
        <Textarea
          name="notes"
          defaultValue={member?.notes}
          maxLength={1000}
          placeholder="Context for the governance committee..."
        />
      </label>
    </ModalForm>
  );
}
export function SettingsDialog({ data }: { data: RecruitmentData }) {
  const { workspace } = data;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" />
          Workspace settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recruitment workspace settings</DialogTitle>
          <DialogDescription>
            Set the survey year and bylaw rules used by Board Terms.
          </DialogDescription>
        </DialogHeader>
        <form action={saveRecruitmentSettings} className="space-y-4">
          <HiddenWorkspace data={data} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Accent color"
              name="accentColor"
              type="text"
              defaultValue={workspace.accentColor}
              placeholder="#1f5f8b"
              hint="Six-digit hex color, for example #1f5f8b."
            />
            <Field
              label="Survey year"
              name="surveyYear"
              type="number"
              min={2000}
              max={2100}
              defaultValue={workspace.surveyYear}
            />
            <Field
              label="Term length (years)"
              name="termLengthYears"
              type="number"
              min={1}
              max={10}
              defaultValue={workspace.termLengthYears}
            />
            <Field
              label="Maximum consecutive terms"
              name="maxConsecutiveTerms"
              type="number"
              min={1}
              max={10}
              defaultValue={workspace.maxConsecutiveTerms}
            />
            <Field
              label="Maximum years of service"
              name="maxYearsOfService"
              type="number"
              min={1}
              max={80}
              defaultValue={workspace.maxYearsOfService}
            />
            <Field
              label="Upcoming AGM year"
              name="upcomingAgmYear"
              type="number"
              min={2000}
              max={2100}
              defaultValue={workspace.upcomingAgmYear}
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton>
              <Check className="size-4" />
              Save settings
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
