"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteRecruitmentMember,
  saveRecruitmentTermRules,
  toggleRecruitmentMember,
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
import { Input } from "@/components/ui/input";
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
  ConfirmAction,
  EmptyState,
  HiddenWorkspace,
  SectionHeader,
  StatCard,
} from "./shared";
import { MemberForm } from "./member-form";

function RuleStepper({
  label,
  name,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  name: string;
  value: number | "";
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number | "") => void;
}) {
  return (
    <fieldset className="space-y-1.5 text-sm font-semibold text-slate-700">
      <legend>{label}</legend>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Decrease ${label}`}
          disabled={value === "" || value <= min}
          onClick={() => {
            if (value !== "") onChange(Math.max(min, value - 1));
          }}
        >
          <Minus className="size-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            name={name}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              if (raw === "") {
                onChange("");
                return;
              }
              const next = Number(raw);
              if (Number.isInteger(next)) onChange(next);
            }}
            aria-label={label}
            required
            className={suffix ? "pr-14" : undefined}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">
              {suffix}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Increase ${label}`}
          disabled={value === "" || value >= max}
          onClick={() => {
            if (value !== "") onChange(Math.min(max, value + 1));
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </fieldset>
  );
}

type TermRuleDraft = {
  termLengthYears: number | "";
  maxConsecutiveTerms: number | "";
  maxYearsOfService: number | "";
  upcomingAgmYear: number | "";
};

export function Terms({ data }: { data: RecruitmentData }) {
  const [rules, setRules] = React.useState<TermRuleDraft>({
    termLengthYears: data.workspace.termLengthYears,
    maxConsecutiveTerms: data.workspace.maxConsecutiveTerms,
    maxYearsOfService: data.workspace.maxYearsOfService,
    upcomingAgmYear: data.workspace.upcomingAgmYear,
  });
  const active = data.members.filter((member) => member.active);
  const directors = active.filter((member) => member.memberType === "director");
  const standing = directors.filter(
    (member) => calculateTerm(member, data.workspace).status === "standing",
  );
  const limited = directors.filter(
    (member) => calculateTerm(member, data.workspace).status === "term-limited",
  );
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
      <Card>
        <CardHeader>
          <CardTitle>Term rules</CardTitle>
          <CardDescription>
            Enter the rules from your bylaws. The roster, officer succession,
            and report update from these values after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveRecruitmentTermRules} className="space-y-5">
            <HiddenWorkspace data={data} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <RuleStepper
                label="Term length"
                name="termLengthYears"
                value={rules.termLengthYears}
                min={1}
                max={10}
                suffix="yrs"
                onChange={(value) =>
                  setRules((current) => ({
                    ...current,
                    termLengthYears: value,
                  }))
                }
              />
              <RuleStepper
                label="Max consecutive terms"
                name="maxConsecutiveTerms"
                value={rules.maxConsecutiveTerms}
                min={1}
                max={10}
                onChange={(value) =>
                  setRules((current) => ({
                    ...current,
                    maxConsecutiveTerms: value,
                  }))
                }
              />
              <RuleStepper
                label="Max years of service"
                name="maxYearsOfService"
                value={rules.maxYearsOfService}
                min={1}
                max={80}
                suffix="yrs"
                onChange={(value) =>
                  setRules((current) => ({
                    ...current,
                    maxYearsOfService: value,
                  }))
                }
              />
              <RuleStepper
                label="Upcoming AGM year"
                name="upcomingAgmYear"
                value={rules.upcomingAgmYear}
                min={2000}
                max={2100}
                onChange={(value) =>
                  setRules((current) => ({
                    ...current,
                    upcomingAgmYear: value,
                  }))
                }
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
      <Card>
        <CardHeader>
          <CardTitle>Executive Committee & officer succession</CardTitle>
          <CardDescription>
            Officer seats are derived from active directors.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(officerLabels)
            .filter(([office]) => office)
            .map(([office, label]) => {
              const holder = directors.find(
                (member) => member.office === office,
              );
              const term = holder
                ? calculateTerm(holder, data.workspace)
                : null;
              return (
                <div key={office} className="rounded-lg border p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 font-semibold">
                    {holder?.fullName ?? "Vacant"}
                  </p>
                  <Badge className="mt-3" variant="outline">
                    {!holder
                      ? "Vacant"
                      : term?.status === "standing"
                        ? "Plan succession"
                        : "Serving"}
                  </Badge>
                </div>
              );
            })}
        </CardContent>
      </Card>
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
              {data.members.map((member) => {
                const term = calculateTerm(member, data.workspace);
                return (
                  <TableRow
                    key={member.id}
                    className={!member.active ? "opacity-60" : undefined}
                  >
                    <TableCell className="font-semibold">
                      {member.fullName}
                      <span className="block text-xs font-normal text-slate-500">
                        {member.email || "No email"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.memberType === "staff" ? (
                        <>
                          <Badge variant="outline">Staff</Badge>
                          <span className="mt-1 block text-xs text-slate-500">
                            {member.roleTitle || "Committee support"}
                          </span>
                        </>
                      ) : (
                        member.roleTitle || "Director"
                      )}
                    </TableCell>
                    <TableCell>{member.dateJoined || "—"}</TableCell>
                    <TableCell>
                      {term.status === "staff"
                        ? "Committees only"
                        : term.endYear
                          ? `Term ${term.termNumber} · ends ${term.endYear}`
                          : "Add join date"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          member.active &&
                            "border-green-200 bg-green-50 text-green-800",
                          !member.active && "border-slate-300",
                        )}
                      >
                        {member.active
                          ? term.status === "term-limited"
                            ? "Term-limited"
                            : term.status === "standing"
                              ? "Standing for election"
                              : "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <MemberForm
                          data={data}
                          member={member}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${member.fullName}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <form action={toggleRecruitmentMember}>
                          <HiddenWorkspace data={data} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={member.id}
                          />
                          <input
                            type="hidden"
                            name="active"
                            value={String(member.active)}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              member.active
                                ? `Deactivate ${member.fullName}`
                                : `Reactivate ${member.fullName}`
                            }
                          >
                            <Archive className="size-4" />
                          </Button>
                        </form>
                        <ConfirmAction
                          title={`Delete ${member.fullName}?`}
                          description="This permanently removes the member and their survey responses. Deactivate them instead if you need to preserve audit history."
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${member.fullName}`}
                            >
                              <Trash2 className="size-4 text-red-700" />
                            </Button>
                          }
                          action={deleteRecruitmentMember}
                        >
                          <HiddenWorkspace data={data} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={member.id}
                          />
                        </ConfirmAction>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!data.members.length && (
            <EmptyState>
              Add the first director or staff member to build the roster.
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
