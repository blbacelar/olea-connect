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
import { responseFor } from "@/lib/board-recruitment/metrics";
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

export function Matrix({ data }: { data: RecruitmentData }) {
  const activeDirectors = data.members.filter(
    (member) => member.active && member.memberType === "director",
  );
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
        (category) => {
          const categorySkills = data.skills.filter(
            (skill) => skill.categoryName === category,
          );
          const categoryRow = data.skills.find(
            (skill) => skill.categoryName === category,
          );
          return (
            <Card key={category} data-testid={`skill-category-${category}`}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{category}</CardTitle>
                    <CardDescription>
                      {
                        categorySkills.filter((skill) =>
                          activeDirectors.some((member) =>
                            responseFor(data, member.id, skill.id),
                          ),
                        ).length
                      }{" "}
                      of {categorySkills.length} skills covered by active
                      directors
                    </CardDescription>
                  </div>
                  {categoryRow && (
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
                      <input
                        type="hidden"
                        name="categoryId"
                        value={categoryRow.categoryId}
                      />
                      <Field
                        label="Skill name"
                        name="name"
                        placeholder="Community partnerships"
                        required
                      />
                    </ModalForm>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {categorySkills.map((skill) => {
                  const holders = activeDirectors.filter((member) =>
                    responseFor(data, member.id, skill.id),
                  );
                  const level = coverageLevel(
                    holders.length,
                    activeDirectors.length,
                  );
                  return (
                    <div
                      key={skill.id}
                      data-testid={`skill-card-${skill.id}`}
                      className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{skill.name}</p>
                          {holders.length === 1 && (
                            <Badge
                              data-testid={`skill-risk-${skill.id}`}
                              className="border-red-200 bg-red-50 text-red-800"
                              variant="outline"
                            >
                              Single-holder risk
                            </Badge>
                          )}
                          {skill.isCustom && (
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
                              <input
                                type="hidden"
                                name="skillId"
                                value={skill.id}
                              />
                            </ConfirmAction>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {holders.length ? (
                            holders.map((holder) => (
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
                            ))
                          ) : (
                            <span className="text-sm italic text-slate-500">
                              No one currently on the board
                            </span>
                          )}
                        </div>
                      </div>
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
                              width: `${(holders.length / Math.max(activeDirectors.length, 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-semibold text-slate-500">
                          {holders.length}/{activeDirectors.length}
                        </span>
                        <Badge
                          variant="outline"
                          className="w-20 justify-center"
                        >
                          {level}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        },
      )}
    </div>
  );
}
