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
import { SettingsDialog } from "./member-form";

export function Overview({
  data,
  onNavigate,
}: {
  data: RecruitmentData;
  onNavigate: (tab: RecruitmentTab) => void;
}) {
  const directors = data.members.filter(
    (member) => member.active && member.memberType === "director",
  );
  const categoryStats = [
    ...new Set(data.skills.map((skill) => skill.categoryName)),
  ].map((category) => {
    const skills = data.skills.filter(
      (skill) => skill.categoryName === category,
    );
    const covered = skills.filter((skill) =>
      data.responses.some(
        (response) => response.skillId === skill.id && response.hasSkill,
      ),
    ).length;
    return { category, covered, total: skills.length };
  });
  const gaps = data.skills.filter(
    (skill) =>
      !data.responses.some(
        (response) => response.skillId === skill.id && response.hasSkill,
      ),
  );
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Board governance"
        title="Overview"
        description="A shared recruitment picture for the governance committee: who is on the board, where coverage is strong, and what to recruit next."
        action={<SettingsDialog data={data} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={directors.length} />
        <StatCard label="Skills tracked" value={data.skills.length} />
        <StatCard
          label="Strong coverage areas"
          value={
            categoryStats.filter(
              (item) => item.covered / Math.max(item.total, 1) >= 0.6,
            ).length
          }
          tone="success"
        />
        <StatCard
          label="Skill gaps to address"
          value={gaps.length}
          tone="danger"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Coverage by category</CardTitle>
            <CardDescription>
              Coverage is based on active directors who have responded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {categoryStats.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between gap-3 text-sm font-semibold">
                  <span>{item.category}</span>
                  <span className="text-slate-500">
                    {item.covered}/{item.total} covered
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-olea-green"
                    style={{
                      width: `${(item.covered / Math.max(item.total, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Where to recruit</CardTitle>
            <CardDescription>
              Skills with no current holder are your clearest recruitment
              priorities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gaps.length ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {gaps.slice(0, 7).map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-800"
                    >
                      {skill.name}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => onNavigate("matrix")}
                >
                  Open Skills Matrix <ChevronRight className="size-4" />
                </Button>
              </>
            ) : (
              <EmptyState>
                All tracked skills have at least one holder.
              </EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Terms & succession</p>
            <p className="mt-1 text-sm text-slate-600">
              Review term limits, officer vacancies, and upcoming AGM decisions.
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("terms")}>
            Open Board Terms <ChevronRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
