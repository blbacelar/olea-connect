import { Download } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { getReferralAdminData } from "@/lib/data/referrals";

import { ReferralAdminTables } from "./referral-admin-tables";
import { ReferralProgramSettings } from "./referral-program-settings";

type ReferralAdminData = Awaited<ReturnType<typeof getReferralAdminData>>;
type ReferralAction = (formData: FormData) => Promise<void>;

export function ReferralAdminView({
  data,
  saveReferralMilestone,
  saveReferralPayout,
  saveReferralProgramSettings,
  saveReferrerStatus,
}: {
  data: ReferralAdminData;
  saveReferralMilestone: ReferralAction;
  saveReferralPayout: ReferralAction;
  saveReferralProgramSettings: ReferralAction;
  saveReferrerStatus: ReferralAction;
}) {
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
      <ReferralStats
        eligiblePayoutCount={eligiblePayoutCount}
        pendingCount={pendingCount}
        programEnabled={data.settings.programEnabled}
        referralCount={data.referrals.length}
      />
      <ReferralProgramSettings
        settings={data.settings}
        saveReferralProgramSettings={saveReferralProgramSettings}
      />
      <ReferralAdminTables
        data={data}
        saveReferralMilestone={saveReferralMilestone}
        saveReferralPayout={saveReferralPayout}
        saveReferrerStatus={saveReferrerStatus}
      />
    </div>
  );
}

function ReferralStats({
  eligiblePayoutCount,
  pendingCount,
  programEnabled,
  referralCount,
}: {
  eligiblePayoutCount: number;
  pendingCount: number;
  programEnabled: boolean;
  referralCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard label="Pending applications" value={pendingCount} />
      <StatCard label="Referrals" value={referralCount} />
      <StatCard label="Eligible payouts" value={eligiblePayoutCount} />
      <div className="rounded-xl border bg-white p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Program
        </p>
        <p className="mt-3">
          <Badge variant="outline" className="bg-white">
            {programEnabled ? "Accepting applications" : "Paused"}
          </Badge>
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-4xl font-black text-slate-900">{value}</p>
    </div>
  );
}
