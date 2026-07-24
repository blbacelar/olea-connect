import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  Lock,
  Send,
} from "lucide-react";
import Image from "next/image";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { getGrantsData } from "@/lib/data/grants";
import {
  grantFocusAreaLabels,
  grantFocusAreas,
  grantStatusLabels,
  type GrantApplicationStatus,
} from "@/lib/grants/domain";
import type { GrantApplicationSummary, GrantRound } from "@/lib/types";

import {
  awardGrantApplication,
  reviewGrantApplication,
  saveGrantApplication,
  saveImpactStory,
  updateGrantAward,
  withdrawGrantApplication,
} from "./actions";

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return grantStatusLabels[status as GrantApplicationStatus] ?? status;
}

function statusClass(status: string) {
  if (["approved", "paid"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (status === "declined") return "bg-red-50 text-red-700";
  if (status === "withdrawn") return "bg-slate-100 text-slate-500";
  if (status === "shortlisted") return "bg-amber-50 text-amber-800";
  return "bg-olea-light text-olea-green";
}

function RoundHero({ round }: { round: GrantRound }) {
  return (
    <section className="relative mb-7 overflow-hidden rounded-[14px] bg-[linear-gradient(120deg,#173F2A_0%,#446B52_100%)] p-7 text-white">
      <Image
        src="/olea-tree.png"
        alt=""
        width={200}
        height={200}
        className="absolute -bottom-8 -right-7 size-[200px] opacity-10"
      />
      <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold capitalize tracking-wide">
        <span className="size-1.5 rounded-full bg-green-200" />
        {round.programType.replace("_", " ")} · Applications {round.status}
      </span>
      <h2 className="relative mt-3.5 text-2xl font-bold tracking-[-0.01em]">
        {round.name}
      </h2>
      <p className="relative mt-1.5 text-[15px] text-[#E2EFE6]">
        {formatMoney(round.awardAmountCents)} grant · {round.availableAwards}{" "}
        award{round.availableAwards === 1 ? "" : "s"} ·{" "}
        {formatDate(round.opensAt)} to {formatDate(round.closesAt)}
      </p>
      <p className="relative mt-3 max-w-2xl text-sm leading-6 text-[#E2EFE6]">
        {round.description}
      </p>
      {round.publicNotes ? (
        <p className="relative mt-3 max-w-2xl rounded-lg bg-white/10 p-3 text-sm leading-6 text-[#E2EFE6]">
          {round.publicNotes}
        </p>
      ) : null}
    </section>
  );
}

function ApplicationForm({
  application,
  defaults,
  round,
}: {
  application: GrantApplicationSummary | undefined;
  defaults: {
    annualRevenueCents: number | null;
    craGoodStanding: boolean | null;
    registeredInCanada: boolean;
  };
  round: GrantRound;
}) {
  const canEdit = !application || application.status === "draft";
  const defaultRevenue =
    application?.annualRevenueCents ?? defaults.annualRevenueCents;

  if (!canEdit) {
    return (
      <div className="rounded-xl border bg-white p-5 shadow-soft">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Lock className="size-4 text-olea-green" />
          Application already submitted
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          One application is allowed per organization per round. Track its status
          in your application history below.
        </p>
      </div>
    );
  }

  return (
    <form action={saveGrantApplication} className="rounded-xl border bg-white p-5 shadow-soft">
      <input name="roundId" type="hidden" value={round.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Focus area
          <FormSelect
            defaultValue={application?.focusArea ?? "operational_capacity"}
            name="focusArea"
            placeholder="Choose focus area"
            options={grantFocusAreas.map((focusArea) => ({
              label: grantFocusAreaLabels[focusArea],
              value: focusArea,
            }))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Requested amount
          <CurrencyInput
            defaultValue={
              application
                ? String(application.requestedAmountCents / 100)
                : String(round.awardAmountCents / 100)
            }
            max={round.awardAmountCents / 100}
            min={1}
            name="requestedAmount"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Annual revenue
          <CurrencyInput
            defaultValue={defaultRevenue ? String(defaultRevenue / 100) : ""}
            name="annualRevenue"
          />
        </label>
        <div className="grid content-end gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              defaultChecked={
                application?.registeredInCanada ?? defaults.registeredInCanada
              }
              name="registeredInCanada"
              type="checkbox"
            />
            Registered in Canada
          </label>
          <label className="flex items-center gap-2">
            <input
              defaultChecked={
                application?.craGoodStanding ?? Boolean(defaults.craGoodStanding)
              }
              name="craGoodStanding"
              type="checkbox"
            />
            CRA good standing confirmed
          </label>
        </div>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        150-250 word narrative
        <Textarea
          className="mt-2 min-h-[180px]"
          defaultValue={application?.fundingRequest ?? ""}
          name="fundingRequest"
          placeholder="Tell us what you will fund, who it supports, and why this capacity investment matters now."
        />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Expected outcome
        <Textarea
          className="mt-2"
          defaultValue={application?.expectedOutcome ?? ""}
          name="expectedOutcome"
          placeholder="Describe the practical outcome your organization expects to report back."
        />
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button name="intent" type="submit" value="draft" variant="outline">
          Save draft
        </Button>
        <Button name="intent" type="submit" value="submit">
          <Send className="size-4" />
          Submit application
        </Button>
      </div>
    </form>
  );
}

function ApplicationHistory({
  applications,
}: {
  applications: GrantApplicationSummary[];
}) {
  if (!applications.length) {
    return (
      <EmptyPanel
        title="No applications yet"
        description="Applications open quarterly. Your history will appear here."
        icon={<Gift className="size-5" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <article
          key={application.id}
          className="rounded-xl border bg-white p-5 shadow-soft"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{application.roundName}</p>
              <p className="mt-1 text-xs text-slate-400">
                Updated {formatDate(application.updatedAt)}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                application.status,
              )}`}
            >
              {statusLabel(application.status)}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Amount
              </dt>
              <dd className="mt-1 font-semibold">
                {formatMoney(application.requestedAmountCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Focus
              </dt>
              <dd className="mt-1 font-semibold">
                {grantFocusAreaLabels[application.focusArea as keyof typeof grantFocusAreaLabels] ??
                  application.focusArea}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Submitted
              </dt>
              <dd className="mt-1 font-semibold">
                {formatDate(application.submittedAt)}
              </dd>
            </div>
          </dl>
          {["draft", "submitted", "in_review", "shortlisted"].includes(
            application.status,
          ) ? (
            <form action={withdrawGrantApplication} className="mt-4">
              <input name="applicationId" type="hidden" value={application.id} />
              <Button size="sm" type="submit" variant="outline">
                Withdraw
              </Button>
            </form>
          ) : null}
          {application.reviews?.length ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-700">Reviewer feedback</p>
              {application.reviews.map((review) => (
                <p key={review.id} className="mt-1">
                  {review.recommendation}
                </p>
              ))}
            </div>
          ) : null}
          {application.award && application.award.status !== "canceled" ? (
            <form action={saveImpactStory} className="mt-5 rounded-lg bg-emerald-50 p-4">
              <input name="applicationId" type="hidden" value={application.id} />
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                <Award className="size-4" />
                Award {formatMoney(application.award.amountCents)} ·{" "}
                {application.award.status}
              </p>
              <label className="mt-3 block text-sm font-semibold text-emerald-950">
                Impact story
                <Textarea
                  className="mt-2 bg-white"
                  defaultValue={application.award.impactStory ?? ""}
                  name="impactStory"
                  placeholder="Share the outcome when your funded work is complete."
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm text-emerald-900">
                <input
                  defaultChecked={application.award.impactStoryConsent}
                  name="impactStoryConsent"
                  type="checkbox"
                />
                Olea may share this story publicly
              </label>
              <Button className="mt-3" size="sm" type="submit" variant="outline">
                Save impact story
              </Button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function AdminBoard({
  applications,
}: {
  applications: GrantApplicationSummary[];
}) {
  if (!applications.length) {
    return (
      <div className="mt-8">
        <SectionHeading>Grant administration</SectionHeading>
        <EmptyPanel
          title="No applications ready for review"
          description="Submitted applications will appear here for scoring and decisions."
          icon={<ClipboardCheck className="size-5" />}
        />
      </div>
    );
  }

  return (
    <section className="mt-8">
      <SectionHeading>Grant administration</SectionHeading>
      <div className="space-y-4">
        {applications.map((application) => {
          const canReview = ["submitted", "in_review", "shortlisted"].includes(
            application.status,
          );
          const canCreateAward =
            !application.award &&
            ["shortlisted", "approved"].includes(application.status);

          return (
          <article
            key={application.id}
            className="rounded-xl border bg-white p-5 shadow-soft"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{application.organizationName}</p>
                <h3 className="text-lg font-bold text-slate-800">
                  {application.roundName}
                </h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                  application.status,
                )}`}
              >
                {statusLabel(application.status)}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {application.fundingRequest}
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <span className="font-semibold">Expected outcome:</span>{" "}
              {application.expectedOutcome}
            </p>
            {canReview ? (
            <form action={reviewGrantApplication} className="mt-5 grid gap-3 md:grid-cols-[100px_1fr_1fr_150px]">
              <input name="applicationId" type="hidden" value={application.id} />
              <label className="text-sm font-semibold text-slate-700">
                Score
                <Input
                  defaultValue="3"
                  max={5}
                  min={1}
                  name="score"
                  step={1}
                  type="number"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Member feedback
                <Input name="recommendation" placeholder="Applicant-safe feedback" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Private notes
                <Input name="internalNotes" placeholder="Internal review notes" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Decision
                <FormSelect
                  defaultValue="in_review"
                  name="decision"
                  placeholder="Choose decision"
                  options={[
                    { label: "In review", value: "in_review" },
                    { label: "Shortlist", value: "shortlisted" },
                    { label: "Approve", value: "approved" },
                    { label: "Decline", value: "declined" },
                  ]}
                />
              </label>
              <div className="md:col-span-4">
                <Button size="sm" type="submit">
                  <CheckCircle2 className="size-4" />
                  Save review
                </Button>
              </div>
            </form>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                This application is in a terminal decision state. Review notes
                are read-only from here.
              </p>
            )}
            {application.award ? (
              <form action={updateGrantAward} className="mt-4 grid gap-3 rounded-lg bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_auto]">
                <input name="awardId" type="hidden" value={application.award.id} />
                <label className="text-sm font-semibold text-emerald-950">
                  Payment status
                  <FormSelect
                    defaultValue={application.award.status}
                    name="awardStatus"
                    placeholder="Choose payment status"
                    options={[
                      { label: "Approved", value: "approved" },
                      { label: "Scheduled", value: "scheduled" },
                      { label: "Paid", value: "paid" },
                      { label: "Canceled", value: "canceled" },
                    ]}
                  />
                </label>
                <label className="text-sm font-semibold text-emerald-950">
                  Payment reference
                  <Input
                    defaultValue={application.award.paymentReference ?? ""}
                    name="paymentReference"
                    placeholder="EFT or cheque reference"
                  />
                </label>
                <Button className="self-end" size="sm" type="submit" variant="outline">
                  Update award
                </Button>
              </form>
            ) : canCreateAward ? (
              <form action={awardGrantApplication} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-amber-50 p-4">
                <input name="applicationId" type="hidden" value={application.id} />
                <label className="text-sm font-semibold text-amber-950">
                  Award amount
                  <CurrencyInput
                    defaultValue={String(application.requestedAmountCents / 100)}
                    max={application.requestedAmountCents / 100}
                    min={1}
                    name="awardAmount"
                  />
                </label>
                <Button size="sm" type="submit" variant="outline">
                  Create award
                </Button>
              </form>
            ) : null}
          </article>
          );
        })}
      </div>
    </section>
  );
}

export default async function GrantsPage() {
  const {
    adminApplications,
    applications,
    canAdministerGrants,
    organizationDefaults,
    rounds,
  } = await getGrantsData();
  const featuredRound =
    rounds.find((round) => round.status === "open") ?? rounds[0];
  const openRounds = rounds.filter((round) => round.status === "open");

  return (
    <div>
      <PageHeader
        title="Olea Gives Fund"
        description="Apply for sponsor-funded grants and track decisions from one trusted workspace."
      />

      {featuredRound ? (
        <RoundHero round={featuredRound} />
      ) : (
        <div className="mb-7">
          <EmptyPanel
            title="No grant round is available"
            description="Upcoming Olea Gives rounds will appear here when applications open."
            icon={<Gift className="size-5" />}
          />
        </div>
      )}

      <SectionHeading>Active rounds</SectionHeading>
      {openRounds.length ? (
        <div className="mb-7 grid gap-5">
          {openRounds.map((round) => (
            <ApplicationForm
              application={applications.find(
                (application) => application.roundId === round.id,
              )}
              defaults={organizationDefaults}
              key={round.id}
              round={round}
            />
          ))}
        </div>
      ) : (
        <div className="mb-7">
          <EmptyPanel
            title="No open applications"
            description="You can review upcoming rounds and return when the application window opens."
            icon={<Gift className="size-5" />}
          />
        </div>
      )}

      <SectionHeading>Your application history</SectionHeading>
      <ApplicationHistory applications={applications} />

      {canAdministerGrants ? (
        <AdminBoard applications={adminApplications} />
      ) : null}
    </div>
  );
}
