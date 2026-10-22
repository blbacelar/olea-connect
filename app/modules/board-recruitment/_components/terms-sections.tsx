"use client";

import { Check } from "lucide-react";
import type * as React from "react";

import {
  saveRecruitmentTermRules,
} from "@/app/modules/board-recruitment/actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateTerm, officerLabels } from "@/lib/board-recruitment/domain";
import type { RecruitmentData } from "@/lib/board-recruitment/types";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  HiddenWorkspace,
  StatCard,
} from "./shared";
import { RosterActions } from "./terms-roster-actions";
import { RuleStepper, type TermRuleDraft } from "./terms-rule-stepper";

type RecruitmentMember = RecruitmentData["members"][number];
type RuleSetter = React.Dispatch<React.SetStateAction<TermRuleDraft>>;

export function TermRulesCard({
  data,
  rules,
  setRules,
}: {
  data: RecruitmentData;
  rules: TermRuleDraft;
  setRules: RuleSetter;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Term rules</CardTitle>
        <CardDescription>
          Enter the rules from your bylaws. The roster, officer succession, and
          report update from these values after saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveRecruitmentTermRules} className="space-y-5">
          <HiddenWorkspace data={data} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <RuleStepper
              label="Term length"
              max={10}
              min={1}
              name="termLengthYears"
              onChange={updateRule(setRules, "termLengthYears")}
              suffix="yrs"
              value={rules.termLengthYears}
            />
            <RuleStepper
              label="Max consecutive terms"
              max={10}
              min={1}
              name="maxConsecutiveTerms"
              onChange={updateRule(setRules, "maxConsecutiveTerms")}
              value={rules.maxConsecutiveTerms}
            />
            <RuleStepper
              label="Max years of service"
              max={80}
              min={1}
              name="maxYearsOfService"
              onChange={updateRule(setRules, "maxYearsOfService")}
              suffix="yrs"
              value={rules.maxYearsOfService}
            />
            <RuleStepper
              label="Upcoming AGM year"
              max={2100}
              min={2000}
              name="upcomingAgmYear"
              onChange={updateRule(setRules, "upcomingAgmYear")}
              value={rules.upcomingAgmYear}
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton>
              <Check className="size-4" />
              Save term rules
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TermSummaryCard({
  data,
  directors,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
}) {
  const standing = directors.filter(
    (member) => calculateTerm(member, data.workspace).status === "standing",
  );
  const limited = directors.filter(
    (member) => calculateTerm(member, data.workspace).status === "term-limited",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Term summary</CardTitle>
        <CardDescription>
          Computed from active directors and the rules above.
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
  );
}

export function OfficerSuccessionCard({
  data,
  directors,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Committee & officer succession</CardTitle>
        <CardDescription>Officer seats are derived from active directors.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(officerLabels)
          .filter(([office]) => office)
          .map(([office, label]) => (
            <OfficerCard
              data={data}
              directors={directors}
              key={office}
              label={label}
              office={office}
            />
          ))}
      </CardContent>
    </Card>
  );
}

export function RosterCard({ data }: { data: RecruitmentData }) {
  return (
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
            {data.members.map((member) => (
              <RosterRow data={data} key={member.id} member={member} />
            ))}
          </TableBody>
        </Table>
        {!data.members.length ? (
          <EmptyState>
            Add the first director or staff member to build the roster.
          </EmptyState>
        ) : null}
      </CardContent>
    </Card>
  );
}

function updateRule(setRules: RuleSetter, key: keyof TermRuleDraft) {
  return (value: number | "") => {
    setRules((current) => ({ ...current, [key]: value }));
  };
}

function OfficerCard({
  data,
  directors,
  label,
  office,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  label: string;
  office: string;
}) {
  const holder = directors.find((member) => member.office === office);
  const term = holder ? calculateTerm(holder, data.workspace) : null;

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-semibold">{holder?.fullName ?? "Vacant"}</p>
      <Badge className="mt-3" variant="outline">
        {getOfficerStatusLabel(Boolean(holder), term?.status)}
      </Badge>
    </div>
  );
}

function RosterRow({
  data,
  member,
}: {
  data: RecruitmentData;
  member: RecruitmentMember;
}) {
  const term = calculateTerm(member, data.workspace);

  return (
    <TableRow className={!member.active ? "opacity-60" : undefined}>
      <TableCell className="font-semibold">
        {member.fullName}
        <span className="block text-xs font-normal text-slate-500">
          {member.email || "No email"}
        </span>
      </TableCell>
      <TableCell>
        <MemberTypeCell member={member} />
      </TableCell>
      <TableCell>{member.dateJoined || "—"}</TableCell>
      <TableCell>{getTermLabel(term)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={getStatusClassName(member.active)}>
          {getRosterStatusLabel(member.active, term.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <RosterActions data={data} member={member} />
      </TableCell>
    </TableRow>
  );
}

function MemberTypeCell({ member }: { member: RecruitmentMember }) {
  if (member.memberType !== "staff") return member.roleTitle || "Director";

  return (
    <>
      <Badge variant="outline">Staff</Badge>
      <span className="mt-1 block text-xs text-slate-500">
        {member.roleTitle || "Committee support"}
      </span>
    </>
  );
}

function getOfficerStatusLabel(hasHolder: boolean, status: string | undefined) {
  if (!hasHolder) return "Vacant";
  return status === "standing" ? "Plan succession" : "Serving";
}

function getTermLabel(term: ReturnType<typeof calculateTerm>) {
  if (term.status === "staff") return "Committees only";
  return term.endYear ? `Term ${term.termNumber} · ends ${term.endYear}` : "Add join date";
}

function getStatusClassName(active: boolean) {
  return cn(
    active && "border-green-200 bg-green-50 text-green-800",
    !active && "border-slate-300",
  );
}

function getRosterStatusLabel(active: boolean, termStatus: string) {
  if (!active) return "Inactive";
  if (termStatus === "term-limited") return "Term-limited";
  if (termStatus === "standing") return "Standing for election";
  return "Active";
}
