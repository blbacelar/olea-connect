"use client";

import * as React from "react";
import {
  Check,
  ClipboardCopy,
  ClipboardList,
  FileText,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import {
  approveCompilationAction,
  assignReviewerAction,
  compileEdReviewAction,
  createCampaignAction,
  dismissNewCampaignLinkAction,
  revokeReviewerAccessAction,
  setCycleStatusAction,
  updateCompilationAction,
  updateReviewerAccessAction,
} from "@/app/modules/ed-review/actions";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { EdReviewData } from "@/lib/data/ed-review";
import {
  compilationSummarySchema,
  type CompilationSummary,
} from "@/lib/ed-review/domain";
import { localDateTimeToIso } from "@/lib/ed-review/schedule";

type Tab = "overview" | "campaigns" | "summary" | "access";
const validTabs: Tab[] = ["overview", "campaigns", "summary", "access"];

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "No close date";
}

export function EdReviewWorkspace({
  data,
  activeTab,
  accessOutcome,
  compileFailed = false,
  newCampaignLink,
}: {
  data: EdReviewData;
  activeTab?: string;
  accessOutcome?: string;
  compileFailed?: boolean;
  newCampaignLink?: string;
}) {
  const [tab, setTab] = React.useState<Tab>(
    validTabs.includes(activeTab as Tab) ? (activeTab as Tab) : "overview",
  );
  const navigate = (nextTab: Tab) => {
    setTab(nextTab);
    window.history.replaceState(null, "", `/modules/ed-review?tab=${nextTab}`);
  };
  const totalResponses = data.campaigns.reduce(
    (sum, campaign) => sum + campaign.responseCount,
    0,
  );
  const canCompile = totalResponses >= data.cycle.minimumResponseCount;
  const boardChairCount = new Set(
    data.reviewers
      .filter((reviewer) => reviewer.role === "board_chair")
      .map((reviewer) => reviewer.userId),
  ).size;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-8">
      <Card className="overflow-hidden">
        <div className="h-2 bg-olea-green" />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
                Confidential review
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                {data.cycle.title}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Run anonymous staff and partner feedback surveys, then prepare a
                threshold-protected Board Chair summary.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(value) => navigate(value as Tab)}
        className="space-y-6"
      >
        <div className="overflow-x-auto rounded-xl border bg-white p-2 shadow-soft">
          <TabsList className="h-auto min-w-max gap-1 bg-slate-50">
            <TabsTrigger value="overview" className="min-h-11 gap-2">
              <ClipboardList className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="min-h-11 gap-2">
              <Users className="size-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="summary" className="min-h-11 gap-2">
              <FileText className="size-4" />
              Board Chair Summary
            </TabsTrigger>
            <TabsTrigger value="access" className="min-h-11 gap-2">
              <LockKeyhole className="size-4" />
              Access & audit
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric title="Cycle status" value={data.cycle.status} />
            <Metric title="Campaigns" value={String(data.campaigns.length)} />
            <Metric
              title="Anonymous responses"
              value={String(totalResponses)}
              detail={`Summary threshold: ${data.cycle.minimumResponseCount}`}
            />
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Privacy boundary</CardTitle>
              <CardDescription>
                Responses are anonymous: this module does not store participant
                names, emails, account identifiers, device data, IP addresses,
                or user agents with survey answers.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Feedback campaigns</h2>
              <p className="mt-1 text-slate-600">
                Create a separate anonymous link for staff or partners. A
                delivery list is never joined to responses.
              </p>
            </div>
            {data.isBoardChair ? (
              <CreateCampaignDialog
                cycleId={data.cycle.id}
                newCampaignLink={newCampaignLink}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {data.isBoardChair && data.cycle.status === "draft" ? (
              <StatusForm
                cycleId={data.cycle.id}
                status="open"
                label="Open review"
              />
            ) : null}
            {data.isBoardChair && data.cycle.status === "open" ? (
              <StatusForm
                cycleId={data.cycle.id}
                status="closed"
                label="Close review"
                variant="outline"
              />
            ) : null}
          </div>
          {newCampaignLink ? <NewCampaignLink link={newCampaignLink} /> : null}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-4">Campaign</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Open</th>
                      <th className="p-4">Responses</th>
                      <th className="p-4">Privacy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.length ? (
                      data.campaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="border-b last:border-0"
                        >
                          <td className="p-4">
                            <p className="font-semibold text-slate-900">
                              {campaign.title}
                            </p>
                            <p className="text-slate-500">
                              {campaign.kind === "staff"
                                ? "Staff feedback"
                                : "Partner feedback"}
                            </p>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{campaign.status}</Badge>
                          </td>
                          <td className="p-4">
                            {formatDate(campaign.opensAt)}
                            <span className="block text-slate-500">
                              {formatDate(campaign.closesAt)}
                            </span>
                          </td>
                          <td className="p-4 font-semibold">
                            {campaign.responseCount}
                          </td>
                          <td className="p-4 text-slate-600">
                            Anonymous responses only
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-10 text-center text-slate-500"
                        >
                          No campaigns yet. Create the staff or partner survey
                          when the review is ready.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Board Chair Feedback Summary</CardTitle>
              <CardDescription>
                Deterministic score averages and anonymized themes become
                available only after the combined minimum response threshold is
                met.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {compileFailed ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                  role="alert"
                >
                  The confidential summary could not be compiled. No review data
                  was changed. Please try again shortly.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
                <span>
                  {canCompile
                    ? "The anonymity threshold is met. Compile a new, versioned summary when you are ready."
                    : `${Math.max(data.cycle.minimumResponseCount - totalResponses, 0)} more anonymous response${data.cycle.minimumResponseCount - totalResponses === 1 ? "" : "s"} required before compilation.`}
                </span>
                {data.isBoardChair && canCompile ? (
                  <form action={compileEdReviewAction}>
                    <input type="hidden" name="cycleId" value={data.cycle.id} />
                    <SubmitButton pendingText="Compiling safely...">
                      Compile summary
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
              {data.compilations.length ? (
                data.compilations.map((compilation) => (
                  <CompilationCard
                    key={compilation.id}
                    compilation={compilation}
                    canManage={data.isBoardChair}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-600">
                  No compiled summary yet. Scores remain protected until the
                  response threshold is met.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          {accessOutcome === "final-chair" ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              role="alert"
            >
              This change was not saved because the review must retain at least
              one Board Chair. Assign another Board Chair first, then try
              again.
            </p>
          ) : accessOutcome === "failed" ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
              role="alert"
            >
              Confidential access could not be confirmed. Refresh this page
              before trying again so you do not accidentally repeat a change.
            </p>
          ) : accessOutcome === "stale-assignment" ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              role="alert"
            >
              This reviewer access was already changed. The latest reviewer
              list is now shown.
            </p>
          ) : accessOutcome === "permission-changed" ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
              role="alert"
            >
              Your Board Chair access changed before this update could be
              saved. The latest reviewer list is now shown.
            </p>
          ) : accessOutcome === "duplicate-reviewer" ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              role="alert"
            >
              This platform user already has confidential access. Use their edit
              control to change their reviewer role instead.
            </p>
          ) : accessOutcome === "assign-failed" ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
              role="alert"
            >
              Confidential access could not be assigned. Refresh this page and
              try again.
            </p>
          ) : null}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Explicit reviewers</CardTitle>
                    <CardDescription>
                      Only assigned Board Chair and HR reviewers can open review
                      data. Organization membership alone is not enough.
                    </CardDescription>
                  </div>
                  {data.isBoardChair ? (
                    <AssignReviewerDialog
                      cycleId={data.cycle.id}
                      assignedReviewerUserIds={data.reviewers.map(
                        (reviewer) => reviewer.userId,
                      )}
                      reviewers={data.availableReviewers}
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent
                className="space-y-3"
                data-testid="ed-review-reviewer-list"
              >
                {data.reviewers.map((reviewer) => (
                  <div
                    key={reviewer.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    data-testid={`ed-review-reviewer-${reviewer.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{reviewer.name}</span>
                      <Badge variant="outline">
                        {reviewer.role.replace("_", " ")}
                      </Badge>
                    </div>
                    {data.isBoardChair && reviewer.role !== "privileged_auditor" ? (
                      <ReviewerAccessActions
                        boardChairCount={boardChairCount}
                        cycleId={data.cycle.id}
                        reviewer={reviewer}
                      />
                    ) : null}
                  </div>
                ))}
                {data.isBoardChair && boardChairCount === 1 ? (
                  <p className="text-sm text-slate-600">
                    This review needs at least one Board Chair. Assign another
                    Board Chair before changing or removing the current access.
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Audit log</CardTitle>
                <CardDescription>
                  Review access and lifecycle changes are recorded.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.auditEvents.map((event) => (
                  <div key={event.id} className="border-b pb-3 last:border-0">
                    <p className="font-medium">
                      {event.eventType.replaceAll("_", " ")}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function summaryFromCompilation(value: unknown): CompilationSummary | null {
  if (!value || typeof value !== "object" || !("generated_summary" in value))
    return null;
  const summary = (value as { generated_summary?: unknown }).generated_summary;
  const parsed = compilationSummarySchema.safeParse(summary);
  return parsed.success ? parsed.data : null;
}

function CompilationCard({
  compilation,
  canManage,
}: {
  compilation: EdReviewData["compilations"][number];
  canManage: boolean;
}) {
  const summary = summaryFromCompilation(compilation.summary);
  return (
    <article className="rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Version {compilation.version}</p>
          <p className="text-sm text-slate-600">
            {compilation.responseCount} responses ·{" "}
            {formatDate(compilation.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && summary && !compilation.approvedAt ? (
            <EditCompilationDialog
              compilationId={compilation.id}
              summary={summary}
            />
          ) : null}
          {compilation.approvedAt ? (
            <Badge>Approved</Badge>
          ) : canManage ? (
            <form action={approveCompilationAction}>
              <input
                type="hidden"
                name="compilationId"
                value={compilation.id}
              />
              <SubmitButton variant="outline" pendingText="Approving...">
                Approve summary
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
      {summary ? (
        <div className="mt-5 space-y-5">
          <p className="leading-7 text-slate-700">
            {summary.executive_summary}
          </p>
          <SummaryFindings heading="Strengths" findings={summary.strengths} />
          <SummaryFindings
            heading="Growth opportunities"
            findings={summary.growth_opportunities}
          />
          <SummaryFindings
            heading="Cross-cutting themes"
            findings={summary.cross_cutting_themes}
          />
          <div>
            <h3 className="font-semibold">
              Suggested Board discussion questions
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {summary.recommended_discussion_questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          This version predates the structured summary format.
        </p>
      )}
    </article>
  );
}

function SummaryFindings({
  heading,
  findings,
}: {
  heading: string;
  findings: CompilationSummary["strengths"];
}) {
  if (!findings.length) return null;
  return (
    <div>
      <h3 className="font-semibold">{heading}</h3>
      <ul className="mt-2 space-y-2 text-sm text-slate-700">
        {findings.map((finding) => (
          <li key={`${finding.title}-${finding.detail}`}>
            <span className="font-medium">{finding.title}:</span>{" "}
            {finding.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

function findingsToText(findings: CompilationSummary["strengths"]) {
  return findings
    .map((finding) => `${finding.title} | ${finding.detail}`)
    .join("\n");
}

function EditCompilationDialog({
  compilationId,
  summary,
}: {
  compilationId: string;
  summary: CompilationSummary;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Edit summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Board Chair summary</DialogTitle>
          <DialogDescription>
            Keep revisions factual, deidentified, and grounded in the compiled
            results. Use one finding per line as “Title | detail”.
          </DialogDescription>
        </DialogHeader>
        <form action={updateCompilationAction} className="grid gap-4">
          <input type="hidden" name="compilationId" value={compilationId} />
          <SummaryTextarea
            name="executiveSummary"
            label="Executive summary"
            defaultValue={summary.executive_summary}
          />
          <SummaryTextarea
            name="strengths"
            label="Strengths"
            defaultValue={findingsToText(summary.strengths)}
          />
          <SummaryTextarea
            name="growthOpportunities"
            label="Growth opportunities"
            defaultValue={findingsToText(summary.growth_opportunities)}
          />
          <SummaryTextarea
            name="crossCuttingThemes"
            label="Cross-cutting themes"
            defaultValue={findingsToText(summary.cross_cutting_themes)}
          />
          <SummaryTextarea
            name="discussionQuestions"
            label="Board discussion questions"
            defaultValue={summary.recommended_discussion_questions.join("\n")}
          />
          <SubmitButton pendingText="Saving summary...">
            Save revision
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTextarea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        maxLength={8000}
        required
      />
    </div>
  );
}

function AssignReviewerDialog({
  assignedReviewerUserIds,
  cycleId,
  reviewers,
}: {
  assignedReviewerUserIds: string[];
  cycleId: string;
  reviewers: EdReviewData["availableReviewers"];
}) {
  const [open, setOpen] = React.useState(false);
  const [userId, setUserId] = React.useState("");
  const [role, setRole] = React.useState<"board_chair" | "hr_reviewer">(
    "hr_reviewer",
  );
  const availableReviewers = reviewers.filter(
    (reviewer) => !assignedReviewerUserIds.includes(reviewer.userId),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Assign reviewer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a confidential reviewer</DialogTitle>
          <DialogDescription>
            This explicitly grants access to this review only. It does not grant
            the person access to other confidential reviews.
          </DialogDescription>
        </DialogHeader>
        <form action={assignReviewerAction} className="grid gap-4">
          <input type="hidden" name="cycleId" value={cycleId} />
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="role" value={role} />
          <div className="grid gap-2">
            <Label>Workspace member</Label>
            <Select
              disabled={availableReviewers.length === 0}
              value={userId}
              onValueChange={setUserId}
            >
              <SelectTrigger aria-label="Workspace member">
                <SelectValue
                  placeholder={
                    availableReviewers.length
                      ? "Select a workspace member"
                      : "All members already have review access"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableReviewers.map((reviewer) => (
                  <SelectItem key={reviewer.userId} value={reviewer.userId}>
                    {reviewer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">
              A person can hold one reviewer role per review. Change an
              existing person&apos;s role from their reviewer card.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Confidential reviewer role</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                setRole(value as "board_chair" | "hr_reviewer")
              }
            >
              <SelectTrigger aria-label="Confidential reviewer role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="board_chair">Board Chair</SelectItem>
                <SelectItem value="hr_reviewer">HR reviewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SubmitButton disabled={!userId} pendingText="Assigning reviewer...">
            Assign reviewer
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewerAccessActions({
  boardChairCount,
  cycleId,
  reviewer,
}: {
  boardChairCount: number;
  cycleId: string;
  reviewer: EdReviewData["reviewers"][number];
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [role, setRole] = React.useState<"board_chair" | "hr_reviewer">(
    reviewer.role === "board_chair" ? "board_chair" : "hr_reviewer",
  );
  const isOnlyBoardChair =
    reviewer.role === "board_chair" && boardChairCount <= 1;
  const lockReason =
    "Assign another Board Chair before changing or removing this access.";

  function handleEditOpenChange(open: boolean) {
    if (open) {
      setRole(reviewer.role === "board_chair" ? "board_chair" : "hr_reviewer");
    }
    setEditOpen(open);
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogTrigger asChild>
          <Button
            aria-label={`Edit access for ${reviewer.name}`}
            disabled={isOnlyBoardChair}
            size="icon"
            title={isOnlyBoardChair ? lockReason : "Edit access"}
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit confidential access</DialogTitle>
            <DialogDescription>
              Change {reviewer.name}&apos;s access for this review only.
            </DialogDescription>
          </DialogHeader>
          <form
            action={updateReviewerAccessAction}
            className="grid gap-4"
            onSubmit={() => setEditOpen(false)}
          >
            <input type="hidden" name="assignmentId" value={reviewer.id} />
            <input type="hidden" name="cycleId" value={cycleId} />
            <input type="hidden" name="role" value={role} />
            <div className="grid gap-2">
              <Label>Confidential reviewer role</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  setRole(value as "board_chair" | "hr_reviewer")
                }
              >
                <SelectTrigger aria-label="Updated confidential reviewer role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board_chair">Board Chair</SelectItem>
                  <SelectItem value="hr_reviewer">HR reviewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SubmitButton pendingText="Saving access...">Save access</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogTrigger asChild>
          <Button
            aria-label={`Remove access for ${reviewer.name}`}
            disabled={isOnlyBoardChair}
            size="icon"
            title={isOnlyBoardChair ? lockReason : "Remove access"}
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove confidential access?</DialogTitle>
            <DialogDescription>
              {reviewer.name} will no longer be able to open this ED/CEO
              review. This does not change their organization membership.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <form
              action={revokeReviewerAccessAction}
              onSubmit={() => setRemoveOpen(false)}
            >
              <input type="hidden" name="assignmentId" value={reviewer.id} />
              <input type="hidden" name="cycleId" value={cycleId} />
              <SubmitButton variant="destructive" pendingText="Removing access...">
                Remove access
              </SubmitButton>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewCampaignLink({ link }: { link: string }) {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(
        "Copy is unavailable in this browser. Select the link and copy it manually.",
      );
    }
  };

  return (
    <Card className="border-olea-green/30 bg-olea-light/40">
      <CardHeader>
        <CardTitle className="text-lg">Anonymous survey link created</CardTitle>
        <CardDescription>
          Copy this generic link now and share it only with the intended
          audience. It is not stored in the platform and will disappear from
          this screen shortly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input aria-label="New anonymous survey link" readOnly value={link} />
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? (
            <Check className="size-4" />
          ) : (
            <ClipboardCopy className="size-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <form action={dismissNewCampaignLinkAction}>
          <SubmitButton variant="ghost">I saved the link</SubmitButton>
        </form>
        {copyError ? (
          <p role="alert" className="text-sm text-amber-800 sm:basis-full">
            {copyError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-3xl font-bold capitalize text-slate-900">
          {value}
        </p>
        {detail ? (
          <p className="mt-2 text-sm text-slate-600">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusForm({
  cycleId,
  status,
  label,
  variant,
}: {
  cycleId: string;
  status: "open" | "closed";
  label: string;
  variant?: "outline";
}) {
  return (
    <form action={setCycleStatusAction}>
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}

function CreateCampaignDialog({
  cycleId,
  newCampaignLink,
}: {
  cycleId: string;
  newCampaignLink?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"staff" | "partner">("staff");

  React.useEffect(() => {
    if (newCampaignLink) setOpen(false);
  }, [newCampaignLink]);

  const now = new Date();
  const localDateTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);

  const normalizeSchedule = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const opensAt = form.elements.namedItem("opensAtLocal") as HTMLInputElement;
    const closesAt = form.elements.namedItem(
      "closesAtLocal",
    ) as HTMLInputElement;
    const normalizedOpensAt = localDateTimeToIso(opensAt.value);
    const normalizedClosesAt = closesAt.value
      ? localDateTimeToIso(closesAt.value)
      : "";

    if (!normalizedOpensAt || (closesAt.value && !normalizedClosesAt)) {
      event.preventDefault();
      return;
    }

    (form.elements.namedItem("opensAt") as HTMLInputElement).value =
      normalizedOpensAt;
    (form.elements.namedItem("closesAt") as HTMLInputElement).value =
      normalizedClosesAt ?? "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Create campaign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create anonymous feedback campaign</DialogTitle>
          <DialogDescription>
            After creation, you will get one short-lived chance to copy the
            generic link. Only its hash is kept in the database.
          </DialogDescription>
        </DialogHeader>
        <form
          action={createCampaignAction}
          className="grid gap-4"
          onSubmit={normalizeSchedule}
        >
          <input type="hidden" name="cycleId" value={cycleId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="opensAt" />
          <input type="hidden" name="closesAt" />
          <div className="grid gap-2">
            <Label htmlFor="campaign-title">Campaign title</Label>
            <Input
              id="campaign-title"
              name="title"
              maxLength={160}
              required
              placeholder="e.g. 2026 staff feedback"
            />
          </div>
          <div className="grid gap-2">
            <Label>Audience</Label>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value as "staff" | "partner")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff feedback survey</SelectItem>
                <SelectItem value="partner">
                  Partner and stakeholder survey
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-opens-at">Opens at</Label>
            <Input
              id="campaign-opens-at"
              name="opensAtLocal"
              type="datetime-local"
              defaultValue={localDateTime}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-closes-at">Closes at (optional)</Label>
            <Input
              id="campaign-closes-at"
              name="closesAtLocal"
              type="datetime-local"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-recipients">Optional delivery list</Label>
            <Textarea
              id="campaign-recipients"
              name="recipientEmails"
              maxLength={12_000}
              placeholder="One email per line, or separate addresses with commas."
            />
            <p className="text-sm text-slate-600">
              The same shared link is emailed to every address. Delivery records
              remain separate from anonymous responses.
            </p>
          </div>
          <SubmitButton pendingText="Creating link...">
            Create campaign
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
