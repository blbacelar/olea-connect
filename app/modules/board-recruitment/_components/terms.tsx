"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
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
  const french = useLocaleContext().locale === "fr-CA";
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
        eyebrow={french ? "Registre et relève" : "Roster & succession"}
        title={french ? "Mandats du conseil" : "Board Terms"}
        description={french ? "Tenez un registre commun et appliquez les règles de mandat de vos règlements administratifs à chaque administrateur actif." : "Maintain the shared board roster and apply your bylaw term rules to every active director."}
        action={
          <MemberForm
            data={data}
            trigger={
              <Button>
                <Plus className="size-4" />
                {french ? "Ajouter un membre" : "Add member"}
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
