"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { RecruitmentData } from "@/lib/board-recruitment/types";

import { MemberForm } from "./member-form";
import { SectionHeader } from "./shared";
import {
  OfficerSuccessionCard,
  RosterCard,
  TermRulesCard,
  TermSummaryCard,
} from "./terms-sections";
import type { TermRuleDraft } from "./terms-rule-stepper";

export function Terms({ data }: { data: RecruitmentData }) {
  const [rules, setRules] = React.useState<TermRuleDraft>({
    termLengthYears: data.workspace.termLengthYears,
    maxConsecutiveTerms: data.workspace.maxConsecutiveTerms,
    maxYearsOfService: data.workspace.maxYearsOfService,
    upcomingAgmYear: data.workspace.upcomingAgmYear,
  });
  const active = data.members.filter((member) => member.active);
  const directors = active.filter((member) => member.memberType === "director");

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
      <TermRulesCard data={data} rules={rules} setRules={setRules} />
      <TermSummaryCard data={data} directors={directors} />
      <OfficerSuccessionCard data={data} directors={directors} />
      <RosterCard data={data} />
    </div>
  );
}
