"use client";

import { Check, Pencil } from "lucide-react";
import * as React from "react";

import {
  createRecruitmentMember,
  saveRecruitmentSettings,
  updateRecruitmentMember,
} from "@/app/modules/board-recruitment/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { officerLabels } from "@/lib/board-recruitment/domain";
import type {
  RecruitmentData,
  RecruitmentMember,
  RecruitmentMemberType,
} from "@/lib/board-recruitment/types";
import { assignedSkillIdsForMember } from "@/lib/board-recruitment/metrics";

import { MemberSkillsField } from "./member-skill-fields";
import { Field, HiddenWorkspace, ModalForm } from "./shared";

export function MemberForm({
  data,
  member,
  trigger,
}: {
  data: RecruitmentData;
  member?: RecruitmentMember;
  trigger: React.ReactNode;
}) {
  const initialMemberType = member?.memberType ?? "director";
  const initialSkillIds = member
    ? assignedSkillIdsForMember(data, member.id)
    : [];
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [memberType, setMemberType] =
    React.useState<RecruitmentMemberType>(initialMemberType);
  const [selectedSkillIds, setSelectedSkillIds] =
    React.useState<string[]>(initialSkillIds);
  const skillsByCategory = data.skills.reduce<Map<string, typeof data.skills>>(
    (groups, skill) => {
      const categorySkills = groups.get(skill.categoryName) ?? [];
      categorySkills.push(skill);
      groups.set(skill.categoryName, categorySkills);
      return groups;
    },
    new Map(),
  );

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId],
    );
  }

  function handleDialogChange(open: boolean) {
    if (open) {
      setMemberType(initialMemberType);
      setSelectedSkillIds(initialSkillIds);
    }
    setDialogOpen(open);
  }

  return (
    <ModalForm
      title={member ? "Edit board roster member" : "Add roster member"}
      description="Directors participate in the survey and terms model. Staff can be assigned to committees only."
      trigger={trigger}
      action={member ? updateRecruitmentMember : createRecruitmentMember}
      submitLabel={member ? "Save member" : "Add member"}
      open={dialogOpen}
      onOpenChange={handleDialogChange}
    >
      <HiddenWorkspace data={data} />
      {member && <input type="hidden" name="memberId" value={member.id} />}
      <MemberIdentityFields member={member} onMemberTypeChange={setMemberType} />
      <MemberSkillsField
        memberType={memberType}
        onToggleSkill={toggleSkill}
        selectedSkillIds={selectedSkillIds}
        skillsByCategory={skillsByCategory}
      />
      <MemberNotesField notes={member?.notes} />
    </ModalForm>
  );
}

function MemberIdentityFields({
  member,
  onMemberTypeChange,
}: {
  member?: RecruitmentMember;
  onMemberTypeChange: (value: RecruitmentMemberType) => void;
}) {
  return (
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
      <MemberTypeField
        defaultValue={member?.memberType ?? "director"}
        onChange={onMemberTypeChange}
      />
      <OfficerField defaultValue={member?.office || "none"} />
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
  );
}

function MemberTypeField({
  defaultValue,
  onChange,
}: {
  defaultValue: RecruitmentMemberType;
  onChange: (value: RecruitmentMemberType) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      <span>Member type</span>
      <Select
        name="memberType"
        defaultValue={defaultValue}
        onValueChange={(value) => onChange(value as RecruitmentMemberType)}
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
  );
}

function OfficerField({ defaultValue }: { defaultValue: string }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      <span>Officer</span>
      <Select name="office" defaultValue={defaultValue}>
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
  );
}


function MemberNotesField({ notes }: { notes?: string | null }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>Notes</span>
      <Textarea
        name="notes"
        defaultValue={notes ?? undefined}
        maxLength={1000}
        placeholder="Context for the governance committee..."
      />
    </label>
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
            Set the workspace accent and survey year. Bylaw rules are managed
            directly in Board Terms.
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
