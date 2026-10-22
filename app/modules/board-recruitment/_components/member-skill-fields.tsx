"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type {
  RecruitmentData,
  RecruitmentMemberType,
} from "@/lib/board-recruitment/types";

type SkillsByCategory = Map<string, RecruitmentData["skills"]>;

export function MemberSkillsField({
  memberType,
  onToggleSkill,
  selectedSkillIds,
  skillsByCategory,
}: {
  memberType: RecruitmentMemberType;
  onToggleSkill: (skillId: string) => void;
  selectedSkillIds: string[];
  skillsByCategory: SkillsByCategory;
}) {
  if (memberType !== "director") {
    return (
      <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-slate-600">
        Staff members are assigned to committees. Skills are tracked for
        directors in the Skills Matrix.
      </div>
    );
  }

  return (
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
          <SkillCategoryChoices
            key={category}
            category={category}
            onToggleSkill={onToggleSkill}
            selectedSkillIds={selectedSkillIds}
            skills={skills}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-slate-500">
        {selectedSkillIds.length} skill
        {selectedSkillIds.length === 1 ? "" : "s"} selected
      </p>
    </fieldset>
  );
}

function SkillCategoryChoices({
  category,
  onToggleSkill,
  selectedSkillIds,
  skills,
}: {
  category: string;
  onToggleSkill: (skillId: string) => void;
  selectedSkillIds: string[];
  skills: RecruitmentData["skills"];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {category}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {skills.map((skill) => (
          <SkillChoice
            key={skill.id}
            checked={selectedSkillIds.includes(skill.id)}
            onToggle={() => onToggleSkill(skill.id)}
            skillId={skill.id}
            skillName={skill.name}
          />
        ))}
      </div>
    </div>
  );
}

function SkillChoice({
  checked,
  onToggle,
  skillId,
  skillName,
}: {
  checked: boolean;
  onToggle: () => void;
  skillId: string;
  skillName: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-olea-green">
      <Checkbox
        name="skillIds"
        value={skillId}
        checked={checked}
        onChange={onToggle}
        className="mt-0.5"
      />
      <span>{skillName}</span>
    </label>
  );
}
