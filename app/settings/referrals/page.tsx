import { notFound } from "next/navigation";
import { Download, Handshake } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { FormSelect } from "@/components/ui/form-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { getReferralAdminData } from "@/lib/data/referrals";
import {
  decimalFromCents,
  formatReferralMoney,
  payoutStatusLabels,
  referralPayoutStatuses,
  referralStatusLabels,
  referralStatuses,
  referrerStatusLabels,
} from "@/lib/referrals/domain";

import {
  updateReferralMilestone,
  updateReferralPayout,
  updateReferralProgramSettings,
  updateReferrerStatus,
} from "./actions";

async function saveReferralProgramSettings(formData: FormData) {
  "use server";
  await updateReferralProgramSettings(formData);
}

async function saveReferrerStatus(formData: FormData) {
  "use server";
  await updateReferrerStatus(formData);
}

async function saveReferralMilestone(formData: FormData) {
  "use server";
  await updateReferralMilestone(formData);
}

async function saveReferralPayout(formData: FormData) {
  "use server";
  await updateReferralPayout(formData);
}

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

export default async function ReferralAdminPage() {
  let data: Awaited<ReturnType<typeof getReferralAdminData>>;
  try {
    data = await getReferralAdminData();
  } catch {
    notFound();
  }

  const pendingCount = data.referrers.filter(
    (referrer) => referrer.status === "pending",
  ).length;
  const eligiblePayoutCount = data.payouts.filter(
    (payout) => payout.status === "eligible",
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Referral operations"
        description="Approve referrers, manage referral milestones, and keep payout evidence auditable."
        action={
          <Button asChild variant="outline" className="bg-white">
            <a href="/settings/referrals/export">
              <Download className="size-4" /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Pending applications
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">{pendingCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Referrals
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">
            {data.referrals.length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Eligible payouts
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">
            {eligiblePayoutCount}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Program
          </p>
          <p className="mt-3">
            <Badge variant="outline" className="bg-white">
              {data.settings.programEnabled ? "Accepting applications" : "Paused"}
            </Badge>
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Handshake className="size-5 text-olea-green" />
          <h2 className="text-xl font-bold text-slate-900">
            Program settings
          </h2>
        </div>
        <form
          action={saveReferralProgramSettings}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <label className="flex items-start gap-3 rounded-lg border bg-olea-light/40 p-4 text-sm text-slate-700 md:col-span-2">
            <input type="hidden" name="programEnabled" value="false" />
            <input
              type="checkbox"
              name="programEnabled"
              defaultChecked={data.settings.programEnabled}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-olea-green"
            />
            <span>
              <span className="block font-semibold text-slate-900">
                Accept referral applications
              </span>
              <span className="mt-1 block text-slate-600">
                Turn this off to pause public applications without disabling
                existing referral links or admin milestone tracking.
              </span>
            </span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Demo attended payout
            <CurrencyInput
              name="demoAttendedPayout"
              defaultValue={decimalFromCents(data.settings.demoAttendedPayoutCents)}
              placeholder="$100.00"
              required
              className="mt-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Retained customer payout
            <CurrencyInput
              name="retainedCustomerPayout"
              defaultValue={decimalFromCents(data.settings.retainedCustomerPayoutCents)}
              placeholder="$400.00"
              required
              className="mt-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Retention window in days
            <Input
              name="retentionDays"
              type="number"
              min={1}
              max={730}
              defaultValue={data.settings.retentionDays}
              placeholder="90"
              required
              className="mt-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Program contact email
            <Input
              name="contactEmail"
              type="email"
              defaultValue={data.settings.contactEmail}
              placeholder="referrals@olivesocialimpact.com"
              required
              className="mt-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Terms URL
            <Input
              name="termsUrl"
              type="url"
              defaultValue={data.settings.termsUrl ?? ""}
              placeholder="https://oleaconnects.com/legal/referral-terms"
              className="mt-2"
            />
          </label>
          <div className="md:col-span-2">
            <SubmitButton pendingText="Saving settings...">
              Save referral settings
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Referrers</h2>
        {data.referrers.length === 0 ? (
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
                {data.referrers.map((referrer) => (
                  <tr key={referrer.id} className="align-top">
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
                        <Input
                          name="statusReason"
                          placeholder="Reason or admin note"
                          maxLength={500}
                        />
                        <SubmitButton size="sm" pendingText="Saving...">
                          Save
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Referral milestones</h2>
        {data.referrals.length === 0 ? (
          <EmptyState>No referred customers have started yet.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Referral</th>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last milestone</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.referrals.map((referral) => (
                  <tr key={referral.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">
                        {referral.referredOrganizationName ?? "Organization pending"}
                      </p>
                      <p className="text-slate-600">
                        {referral.referredEmail ?? "No email captured"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {referral.referralCode}
                      </p>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Payouts</h2>
        {data.payouts.length === 0 ? (
          <EmptyState>No payout records yet.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Payout</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.payouts.map((payout) => (
                  <tr key={payout.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">
                        {payout.milestone === "demo_attended"
                          ? "Demo attended"
                          : "Customer retained"}
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
                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(payout.dueAt)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(payout.paidAt)}
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
