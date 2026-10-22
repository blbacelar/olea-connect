import { LoaderCircle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function ReferralAdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <PageHeader
        title="Referral operations"
        description="Approve referrers, manage referral milestones, and keep payout evidence auditable."
      />
      <Card>
        <CardContent className="flex items-center gap-3 pt-6 text-sm text-slate-600">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          <span>Loading referral information…</span>
        </CardContent>
      </Card>
    </div>
  );
}
