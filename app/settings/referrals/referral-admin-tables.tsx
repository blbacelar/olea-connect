import { FormSelect } from "@/components/ui/form-select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { getReferralAdminData } from "@/lib/data/referrals";
import {
  formatReferralMoney,
  payoutStatusLabels,
  referralPayoutStatuses,
  referralStatusLabels,
  referralStatuses,
  referrerStatusLabels,
} from "@/lib/referrals/domain";

import { ReferralTableHead } from "./referral-table-head";

type ReferralAdminData = Awaited<ReturnType<typeof getReferralAdminData>>;

const referrerActionOptions = [
  { label: "Approve", value: "approved" },
  { label: "Reject", value: "rejected" },
  { label: "Suspend", value: "suspended" },
  { label: "Archive", value: "archived" },
];

const referralStatusOptions = referralStatuses.map((status) => ({
  label: referralStatusLabels[status],
  value: status,
}));

const payoutStatusOptions = referralPayoutStatuses.map((status) => ({
  label: payoutStatusLabels[status],
  value: status,
}));

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center text-slate-600 shadow-soft">
      {children}
    </div>
  );
}

export function ReferralAdminTables({
  data,
  saveReferralMilestone,
  saveReferralPayout,
  saveReferrerStatus,
}: {
  data: ReferralAdminData;
  saveReferralMilestone: (formData: FormData) => Promise<void>;
  saveReferralPayout: (formData: FormData) => Promise<void>;
  saveReferrerStatus: (formData: FormData) => Promise<void>;
}) {
  return (
    <>
      <ReferrersTable
        referrers={data.referrers}
        saveReferrerStatus={saveReferrerStatus}
      />
      <ReferralMilestonesTable
        referrals={data.referrals}
        saveReferralMilestone={saveReferralMilestone}
      />
      <ReferralPayoutsTable
        payouts={data.payouts}
        saveReferralPayout={saveReferralPayout}
      />
    </>
  );
}

function ReferrersTable({
  referrers,
  saveReferrerStatus,
}: {
  referrers: ReferralAdminData["referrers"];
  saveReferrerStatus: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Referrers</h2>
      {referrers.length === 0 ? (
        <EmptyState>No referral applications yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active link</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {referrers.map((referrer) => (
                <ReferrerRow
                  key={referrer.id}
                  referrer={referrer}
                  saveReferrerStatus={saveReferrerStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReferrerRow({
  referrer,
  saveReferrerStatus,
}: {
  referrer: ReferralAdminData["referrers"][number];
  saveReferrerStatus: (formData: FormData) => Promise<void>;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-bold text-slate-900">{referrer.fullName}</p>
        <p className="text-slate-600">{referrer.email}</p>
        <p className="mt-1 text-xs text-slate-500">
          {referrer.organizationName ?? "No organization provided"}
        </p>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="bg-white">
          {referrerStatusLabels[referrer.status]}
        </Badge>
        {referrer.statusReason ? (
          <p className="mt-2 max-w-xs text-xs text-slate-500">
            {referrer.statusReason}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4 font-mono text-xs text-slate-700">
        {referrer.links.find((link) => link.active)?.code ?? "Not issued"}
      </td>
      <td className="px-4 py-4 text-slate-600">
        <p className="max-w-sm">{referrer.relationshipToOlea}</p>
        <p className="mt-2 text-xs">
          Applied {formatDateTime(referrer.createdAt)}
        </p>
      </td>
      <td className="px-4 py-4">
        <form action={saveReferrerStatus} className="space-y-2">
          <input type="hidden" name="referrerId" value={referrer.id} />
          <FormSelect
            name="status"
            defaultValue={referrer.status === "pending" ? "approved" : referrer.status}
            placeholder="Choose action"
            options={referrerActionOptions}
            required
          />
          <Input name="statusReason" placeholder="Reason or admin note" maxLength={500} />
          <SubmitButton size="sm" pendingText="Saving...">
            Save
          </SubmitButton>
        </form>
      </td>
    </tr>
  );
}

function ReferralMilestonesTable({
  referrals,
  saveReferralMilestone,
}: {
  referrals: ReferralAdminData["referrals"];
  saveReferralMilestone: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Referral milestones</h2>
      {referrals.length === 0 ? (
        <EmptyState>No referred customers have started yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
          <table className="w-full min-w-[980px] text-left text-sm">
            <ReferralTableHead columns={["Referral", "Referrer", "Status", "Last milestone", "Action"]} />
            <tbody className="divide-y">
              {referrals.map((referral) => (
                <ReferralMilestoneRow
                  key={referral.id}
                  referral={referral}
                  saveReferralMilestone={saveReferralMilestone}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReferralMilestoneRow({
  referral,
  saveReferralMilestone,
}: {
  referral: ReferralAdminData["referrals"][number];
  saveReferralMilestone: (formData: FormData) => Promise<void>;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-bold text-slate-900">
          {referral.referredOrganizationName ?? "Organization pending"}
        </p>
        <p className="text-slate-600">{referral.referredEmail ?? "No email captured"}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">{referral.referralCode}</p>
      </td>
      <td className="px-4 py-4 text-slate-600">
        <p>{referral.referrerName ?? "Unknown"}</p>
        <p className="text-xs">{referral.referrerEmail}</p>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="bg-white">
          {referralStatusLabels[referral.status]}
        </Badge>
      </td>
      <td className="px-4 py-4 text-slate-600">
        {formatDateTime(referral.lastMilestoneAt)}
      </td>
      <td className="px-4 py-4">
        <form action={saveReferralMilestone} className="space-y-2">
          <input type="hidden" name="referralId" value={referral.id} />
          <FormSelect
            name="status"
            defaultValue={referral.status}
            placeholder="Choose milestone"
            options={referralStatusOptions}
            required
          />
          <Textarea
            name="notes"
            placeholder="Evidence note or reason"
            maxLength={700}
            className="min-h-20"
          />
          <SubmitButton size="sm" pendingText="Saving...">
            Save milestone
          </SubmitButton>
        </form>
      </td>
    </tr>
  );
}

function ReferralPayoutsTable({
  payouts,
  saveReferralPayout,
}: {
  payouts: ReferralAdminData["payouts"];
  saveReferralPayout: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Payouts</h2>
      {payouts.length === 0 ? (
        <EmptyState>No payout records yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
          <table className="w-full min-w-[980px] text-left text-sm">
            <ReferralTableHead columns={["Payout", "Status", "Due", "Paid", "Action"]} />
            <tbody className="divide-y">
              {payouts.map((payout) => (
                <ReferralPayoutRow
                  key={payout.id}
                  payout={payout}
                  saveReferralPayout={saveReferralPayout}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReferralPayoutRow({
  payout,
  saveReferralPayout,
}: {
  payout: ReferralAdminData["payouts"][number];
  saveReferralPayout: (formData: FormData) => Promise<void>;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-bold text-slate-900">
          {payout.milestone === "demo_attended" ? "Demo attended" : "Customer retained"}
        </p>
        <p className="text-slate-600">
          {formatReferralMoney(payout.amountCents, payout.currency)}
        </p>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="bg-white">
          {payoutStatusLabels[payout.status]}
        </Badge>
      </td>
      <td className="px-4 py-4 text-slate-600">{formatDateTime(payout.dueAt)}</td>
      <td className="px-4 py-4 text-slate-600">{formatDateTime(payout.paidAt)}</td>
      <td className="px-4 py-4">
        <form action={saveReferralPayout} className="space-y-2">
          <input type="hidden" name="payoutId" value={payout.id} />
          <FormSelect
            name="status"
            defaultValue={payout.status}
            placeholder="Choose status"
            options={payoutStatusOptions}
            required
          />
          <Input
            name="evidenceUrl"
            type="url"
            placeholder="https://evidence.example"
            defaultValue={payout.evidenceUrl ?? ""}
          />
          <Textarea
            name="notes"
            placeholder="Payment notes or evidence"
            maxLength={700}
            defaultValue={payout.notes ?? ""}
            className="min-h-20"
          />
          <SubmitButton size="sm" pendingText="Saving...">
            Save payout
          </SubmitButton>
        </form>
      </td>
    </tr>
  );
}
