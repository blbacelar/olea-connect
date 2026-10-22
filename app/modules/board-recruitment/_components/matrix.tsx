"use client";

import { ChevronDown, Plus } from "lucide-react";
import * as React from "react";

import { addRecruitmentSkill } from "@/app/modules/board-recruitment/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { responseFor } from "@/lib/board-recruitment/metrics";
import type { RecruitmentData } from "@/lib/board-recruitment/types";
import { cn } from "@/lib/utils";

import {
  Field,
  HiddenWorkspace,
  ModalForm,
  SectionHeader,
} from "./shared";
import { SkillCard } from "./matrix-skill-card";

export function Matrix({ data }: { data: RecruitmentData }) {
  const activeDirectors = data.members.filter(
    (member) => member.active && member.memberType === "director",
  );
  const [collapsedCategories, setCollapsedCategories] = React.useState<
    Set<string>
  >(() => new Set());

  const toggleCategory = (category: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Identified roll-up"
        title="Skills Matrix"
        description="See every skill, its holders, and single points of failure. Custom skills can be added per category."
      />
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        <Badge className="bg-green-100 text-green-800">Strong ≥60%</Badge>
        <Badge className="bg-amber-100 text-amber-800">Moderate 30–59%</Badge>
        <Badge className="bg-red-100 text-red-800">Gap &lt;30%</Badge>
        <Badge variant="outline">Sole holder = at risk</Badge>
      </div>
      {[...new Set(data.skills.map((skill) => skill.categoryName))].map(
        (category) => (
          <SkillCategoryCard
            key={category}
            activeDirectors={activeDirectors}
            category={category}
            data={data}
            isExpanded={!collapsedCategories.has(category)}
            onToggle={toggleCategory}
          />
        ),
      )}
    </div>
  );
}

type SkillCategoryCardProps = {
  activeDirectors: RecruitmentData["members"];
  category: string;
  data: RecruitmentData;
  isExpanded: boolean;
  onToggle: (category: string) => void;
};

function SkillCategoryCard({
  activeDirectors,
  category,
  data,
  isExpanded,
  onToggle,
}: SkillCategoryCardProps) {
  const categorySkills = data.skills.filter(
    (skill) => skill.categoryName === category,
  );
  const categoryRow = data.skills.find(
    (skill) => skill.categoryName === category,
  );
  const contentId = `skill-category-content-${categoryRow?.categoryId ?? category}`;

  return (
    <Card data-testid={`skill-category-${category}`}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SkillCategoryToggle
            activeDirectors={activeDirectors}
            category={category}
            categorySkills={categorySkills}
            contentId={contentId}
            data={data}
            isExpanded={isExpanded}
            onToggle={onToggle}
          />
          {categoryRow && (
            <AddSkillForm
              category={category}
              categoryId={categoryRow.categoryId}
              data={data}
            />
          )}
        </div>
      </CardHeader>
      <CardContent
        id={contentId}
        data-testid={`skill-category-content-${category}`}
        className="space-y-3"
        hidden={!isExpanded}
      >
        {categorySkills.map((skill) => (
          <SkillCard
            key={skill.id}
            activeDirectors={activeDirectors}
            data={data}
            skill={skill}
          />
        ))}
      </CardContent>
    </Card>
  );
}

type SkillCategoryToggleProps = {
  activeDirectors: RecruitmentData["members"];
  category: string;
  categorySkills: RecruitmentData["skills"];
  contentId: string;
  data: RecruitmentData;
  isExpanded: boolean;
  onToggle: (category: string) => void;
};

function SkillCategoryToggle({
  activeDirectors,
  category,
  categorySkills,
  contentId,
  data,
  isExpanded,
  onToggle,
}: SkillCategoryToggleProps) {
  return (
    <button
      type="button"
      className="group flex min-w-0 flex-1 items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olea-green focus-visible:ring-offset-2"
      aria-label={`${category} skills`}
      aria-expanded={isExpanded}
      aria-controls={contentId}
      onClick={() => onToggle(category)}
    >
      <div>
        <CardTitle>{category}</CardTitle>
        <CardDescription>
          <CoveredSkillCount
            activeDirectors={activeDirectors}
            categorySkills={categorySkills}
            data={data}
          />{" "}
          of {categorySkills.length} skills covered by active directors
        </CardDescription>
      </div>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "mt-1 size-5 shrink-0 text-slate-500 transition-transform group-hover:text-slate-900",
          !isExpanded && "-rotate-90",
        )}
      />
    </button>
  );
}

function CoveredSkillCount({
  activeDirectors,
  categorySkills,
  data,
}: {
  activeDirectors: RecruitmentData["members"];
  categorySkills: RecruitmentData["skills"];
  data: RecruitmentData;
}) {
  return categorySkills.filter((skill) =>
    activeDirectors.some((member) => responseFor(data, member.id, skill.id)),
  ).length;
}

function AddSkillForm({
  category,
  categoryId,
  data,
}: {
  category: string;
  categoryId: string;
  data: RecruitmentData;
}) {
  return (
    <ModalForm
      title={`Add skill to ${category}`}
      description="Custom skills are scoped to this workspace and cannot duplicate an existing skill."
      trigger={
        <Button variant="outline">
          <Plus className="size-4" />
          Add skill
        </Button>
      }
      action={addRecruitmentSkill}
    >
      <HiddenWorkspace data={data} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <Field
        label="Skill name"
        name="name"
        placeholder="Community partnerships"
        required
      />
    </ModalForm>
  );
}
