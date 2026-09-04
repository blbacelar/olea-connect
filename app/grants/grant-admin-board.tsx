import { CheckCircle2, ClipboardCheck } from "lucide-react";

import { EmptyPanel } from "@/components/EmptyPanel";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import type { GrantApplicationSummary } from "@/lib/types";

import {
  awardGrantApplication,
  reviewGrantApplication,
  updateGrantAward,
} from "./actions";
import { statusClass, statusLabel } from "./grant-page-format";

export function AdminBoard({
  applications,
}: {
  applications: GrantApplicationSummary[];
}) {
  if (!applications.length) return <EmptyGrantAdminBoard />;

  return (
    <section className="mt-8">
      <SectionHeading>Grant administration</SectionHeading>
      <div className="space-y-4">
        {applications.map((application) => (
          <GrantAdminApplicationCard
            application={application}
            key={application.id}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyGrantAdminBoard() {
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

function GrantAdminApplicationCard({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  const canReview = ["submitted", "in_review", "shortlisted"].includes(
    application.status,
  );
  const canCreateAward =
    !application.award &&
    ["shortlisted", "approved"].includes(application.status);

  return (
    <article className="rounded-xl border bg-white p-5 shadow-soft">
      <GrantAdminApplicationHeader application={application} />
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {application.fundingRequest}
      </p>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        <span className="font-semibold">Expected outcome:</span>{" "}
        {application.expectedOutcome}
      </p>
      <ReviewApplicationForm application={application} canReview={canReview} />
      <AwardControls application={application} canCreateAward={canCreateAward} />
    </article>
  );
}

function GrantAdminApplicationHeader({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  return (
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
  );
}

function ReviewApplicationForm({
  application,
  canReview,
}: {
  application: GrantApplicationSummary;
  canReview: boolean;
}) {
  if (!canReview) {
    return (
      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
        This application is in a terminal decision state. Review notes are
        read-only from here.
      </p>
    );
  }

  return (
    <form
      action={reviewGrantApplication}
      className="mt-5 grid gap-3 md:grid-cols-[100px_1fr_1fr_150px]"
    >
      <input name="applicationId" type="hidden" value={application.id} />
      <label className="text-sm font-semibold text-slate-700">
        Score
        <Input defaultValue="3" max={5} min={1} name="score" step={1} type="number" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Member feedback
        <Input name="recommendation" placeholder="Applicant-safe feedback" />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Private notes
        <Input name="internalNotes" placeholder="Internal review notes" />
      </label>
      <DecisionSelect />
      <div className="md:col-span-4">
        <Button size="sm" type="submit">
          <CheckCircle2 className="size-4" />
          Save review
        </Button>
      </div>
    </form>
  );
}

function DecisionSelect() {
  return (
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
  );
}

function AwardControls({
  application,
  canCreateAward,
}: {
  application: GrantApplicationSummary;
  canCreateAward: boolean;
}) {
  if (application.award) return <UpdateAwardForm application={application} />;
  if (canCreateAward) return <CreateAwardForm application={application} />;
  return null;
}

function UpdateAwardForm({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  if (!application.award) return null;

  return (
    <form
      action={updateGrantAward}
      className="mt-4 grid gap-3 rounded-lg bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_auto]"
    >
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
  );
}

function CreateAwardForm({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  return (
    <form
      action={awardGrantApplication}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-amber-50 p-4"
    >
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
  );
}
