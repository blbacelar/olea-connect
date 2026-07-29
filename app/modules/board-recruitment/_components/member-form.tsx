"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { officerLabels } from "@/lib/board-recruitment/domain";
import type {
  RecruitmentData,
  RecruitmentMember,
  RecruitmentMemberType,
} from "@/lib/board-recruitment/types";
import { assignedSkillIdsForMember } from "@/lib/board-recruitment/metrics";
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
            onValueChange={(value) =>
              setMemberType(value as RecruitmentMemberType)
            }
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
      {memberType === "director" ? (
        <fieldset className="space-y-3 rounded-xl border bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Skills held
          </legend>
          <p className="text-xs leading-5 text-slate-500">
            Select the skills this director holds. These assignments appear in
            Skills Matrix, where a skill with one active holder is flagged as a
            succession risk. Deactivating this member removes them from active
            coverage immediately.
          </p>
          <div className="max-h-80 space-y-4 overflow-y-auto pr-2">
            {[...skillsByCategory].map(([category, skills]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  {category}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {skills.map((skill) => {
                    const checked = selectedSkillIds.includes(skill.id);
                    return (
                      <label
                        key={skill.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-olea-green"
                      >
                        <input
                          type="checkbox"
                          name="skillIds"
                          value={skill.id}
                          checked={checked}
                          onChange={() => toggleSkill(skill.id)}
                          className="mt-0.5 size-4 accent-olea-green"
                        />
                        <span>{skill.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-slate-500">
            {selectedSkillIds.length} skill
            {selectedSkillIds.length === 1 ? "" : "s"} selected
          </p>
        </fieldset>
      ) : (
        <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-slate-600">
          Staff members are assigned to committees. Skills are tracked for
          directors in the Skills Matrix.
        </div>
      )}
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
