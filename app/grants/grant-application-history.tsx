import { Award, Gift } from "lucide-react";

import { EmptyPanel } from "@/components/EmptyPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { grantFocusAreaLabels } from "@/lib/grants/domain";
import type { GrantApplicationSummary } from "@/lib/types";

import { saveImpactStory, withdrawGrantApplication } from "./actions";
import { formatDate, formatMoney, statusClass, statusLabel } from "./grant-page-format";

export function ApplicationHistory({
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
        <ApplicationHistoryCard application={application} key={application.id} />
      ))}
    </div>
  );
}

function ApplicationHistoryCard({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  return (
    <article className="rounded-xl border bg-white p-5 shadow-soft">
      <ApplicationHistoryCardHeader application={application} />
      <ApplicationHistoryStats application={application} />
      <WithdrawApplicationForm application={application} />
      <ReviewerFeedback application={application} />
      <ImpactStoryForm application={application} />
    </article>
  );
}

function ApplicationHistoryCardHeader({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  return (
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
  );
}

function ApplicationHistoryStats({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  const focusLabel =
    grantFocusAreaLabels[
      application.focusArea as keyof typeof grantFocusAreaLabels
    ] ?? application.focusArea;

  return (
    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
      <HistoryStat label="Amount" value={formatMoney(application.requestedAmountCents)} />
      <HistoryStat label="Focus" value={focusLabel} />
      <HistoryStat label="Submitted" value={formatDate(application.submittedAt)} />
    </dl>
  );
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function WithdrawApplicationForm({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  if (!["draft", "submitted", "in_review", "shortlisted"].includes(application.status)) {
    return null;
  }

  return (
    <form action={withdrawGrantApplication} className="mt-4">
      <input name="applicationId" type="hidden" value={application.id} />
      <Button size="sm" type="submit" variant="outline">
        Withdraw
      </Button>
    </form>
  );
}

function ReviewerFeedback({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  if (!application.reviews?.length) return null;

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
      <p className="font-semibold text-slate-700">Reviewer feedback</p>
      {application.reviews.map((review) => (
        <p key={review.id} className="mt-1">
          {review.recommendation}
        </p>
      ))}
    </div>
  );
}

function ImpactStoryForm({
  application,
}: {
  application: GrantApplicationSummary;
}) {
  if (!application.award || application.award.status === "canceled") return null;

  return (
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
  );
}
