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
import { responseFor } from "./helpers";

export function Report({ data }: { data: RecruitmentData }) {
  const [identified, setIdentified] = React.useState(true);
  const directors = data.members.filter(
    (member) => member.active && member.memberType === "director",
  );
  const gaps = data.skills.filter(
    (skill) =>
      !data.responses.some(
        (response) => response.skillId === skill.id && response.hasSkill,
      ),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            Board report
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            Printable recruitment report
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={identified ? "default" : "outline"}
            onClick={() => setIdentified(true)}
          >
            Identified
          </Button>
          <Button
            type="button"
            variant={!identified ? "default" : "outline"}
            onClick={() => setIdentified(false)}
          >
            Anonymous
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>
      <Card className="print:rounded-none print:border-0 print:shadow-none">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            Board Recruitment Toolkit
          </p>
          <CardTitle className="text-3xl">
            {data.workspace.organizationName} · Board Report
          </CardTitle>
          <CardDescription>
            Survey year {data.workspace.surveyYear} ·{" "}
            {identified ? "Identified view" : "Anonymous view"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Active directors" value={directors.length} />
            <StatCard label="Skills tracked" value={data.skills.length} />
            <StatCard
              label="Recruitment priorities"
              value={gaps.length}
              tone="danger"
            />
          </div>
          <section>
            <h3 className="text-lg font-bold">Skills coverage</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Holders</TableHead>
                  <TableHead>Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.skills.map((skill) => {
                  const holders = directors.filter((member) =>
                    responseFor(data, member.id, skill.id),
                  );
                  return (
                    <TableRow key={skill.id}>
                      <TableCell>{skill.categoryName}</TableCell>
                      <TableCell className="font-semibold">
                        {skill.name}
                      </TableCell>
                      <TableCell>
                        {identified
                          ? holders
                              .map((member) => member.fullName)
                              .join(", ") || "None"
                          : `${holders.length} holder(s)`}
                      </TableCell>
                      <TableCell>
                        {coverageLevel(holders.length, directors.length)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
          <section>
            <h3 className="text-lg font-bold">Recruitment priorities</h3>
            {gaps.length ? (
              <div className="flex flex-wrap gap-2">
                {gaps.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="outline"
                    className="border-red-200 bg-red-50 text-red-800"
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No uncovered skills.</p>
            )}
          </section>
          <section className="print:break-before-page">
            <h3 className="text-lg font-bold">Terms & succession</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directors.map((member) => {
                  const term = calculateTerm(member, data.workspace);
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        {identified ? member.fullName : "Director"}
                      </TableCell>
                      <TableCell>{member.roleTitle || "Director"}</TableCell>
                      <TableCell>{term.endYear ?? "Not set"}</TableCell>
                      <TableCell>{term.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
