"use client";

import { Trash2 } from "lucide-react";

import { deleteRecruitmentSkill } from "@/app/modules/board-recruitment/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { coverageLevel } from "@/lib/board-recruitment/domain";
import { responseFor } from "@/lib/board-recruitment/metrics";
import type { RecruitmentData } from "@/lib/board-recruitment/types";
import { cn } from "@/lib/utils";

import { ConfirmAction, HiddenWorkspace } from "./shared";

export function SkillCard({
  activeDirectors,
  data,
  skill,
}: {
  activeDirectors: RecruitmentData["members"];
  data: RecruitmentData;
  skill: RecruitmentData["skills"][number];
}) {
  const holders = activeDirectors.filter((member) =>
    responseFor(data, member.id, skill.id),
  );
  const level = coverageLevel(holders.length, activeDirectors.length);

  return (
    <div
      data-testid={`skill-card-${skill.id}`}
      className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px]"
    >
      <SkillCardDetails data={data} holders={holders} skill={skill} />
      <SkillCoverageMeter
        holderCount={holders.length}
        level={level}
        totalDirectors={activeDirectors.length}
      />
    </div>
  );
}

function SkillCardDetails({
  data,
  holders,
  skill,
}: {
  data: RecruitmentData;
  holders: RecruitmentData["members"];
  skill: RecruitmentData["skills"][number];
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{skill.name}</p>
        {holders.length === 1 && <SingleHolderRisk skillId={skill.id} />}
        {skill.isCustom && <DeleteSkillAction data={data} skill={skill} />}
      </div>
      <SkillHolderBadges holders={holders} />
    </div>
  );
}

function SingleHolderRisk({ skillId }: { skillId: string }) {
  return (
    <Badge
      data-testid={`skill-risk-${skillId}`}
      className="border-red-200 bg-red-50 text-red-800"
      variant="outline"
    >
      Single-holder risk
    </Badge>
  );
}

function DeleteSkillAction({
  data,
  skill,
}: {
  data: RecruitmentData;
  skill: RecruitmentData["skills"][number];
}) {
  return (
    <ConfirmAction
      title={`Delete ${skill.name}?`}
      description="This removes the custom skill from this workspace. Existing responses for it will also be removed."
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${skill.name}`}
        >
          <Trash2 className="size-4 text-red-700" />
        </Button>
      }
      action={deleteRecruitmentSkill}
    >
      <HiddenWorkspace data={data} />
      <input type="hidden" name="skillId" value={skill.id} />
    </ConfirmAction>
  );
}

function SkillHolderBadges({ holders }: { holders: RecruitmentData["members"] }) {
  if (!holders.length) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-sm italic text-slate-500">
          No one currently on the board
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {holders.map((holder) => (
        <Badge
          key={holder.id}
          variant="outline"
          className={
            holders.length === 1
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }
        >
          {holder.fullName}
        </Badge>
      ))}
    </div>
  );
}

function SkillCoverageMeter({
  holderCount,
  level,
  totalDirectors,
}: {
  holderCount: number;
  level: ReturnType<typeof coverageLevel>;
  totalDirectors: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div
          className={cn(
            "h-2 rounded-full",
            level === "strong" && "bg-green-600",
            level === "moderate" && "bg-amber-500",
            level === "gap" && "bg-red-500",
            level === "none" && "bg-slate-300",
          )}
          style={{
            width: `${(holderCount / Math.max(totalDirectors, 1)) * 100}%`,
          }}
        />
      </div>
      <span className="w-12 text-right text-xs font-semibold text-slate-500">
        {holderCount}/{totalDirectors}
      </span>
      <Badge variant="outline" className="w-20 justify-center">
        {level}
      </Badge>
    </div>
  );
}
