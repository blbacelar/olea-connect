import { NextResponse } from "next/server";

import { getReferralAdminData } from "@/lib/data/referrals";
import {
  payoutStatusLabels,
  referralStatusLabels,
  referrerStatusLabels,
} from "@/lib/referrals/domain";
import { csvCell } from "@/lib/referrals/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getReferralAdminData();
  const rows = [
    [
      "type",
      "name",
      "email",
      "organization",
      "referral_code",
      "status",
      "milestone",
      "amount_cents",
      "currency",
      "notes",
    ],
    ...data.referrers.map((referrer) => [
      "referrer",
      referrer.fullName,
      referrer.email,
      referrer.organizationName ?? "",
      referrer.links.find((link) => link.active)?.code ?? "",
      referrerStatusLabels[referrer.status],
      "",
      "",
      "",
      referrer.statusReason ?? "",
    ]),
    ...data.referrals.map((referral) => [
      "referral",
      referral.referrerName ?? "",
      referral.referredEmail ?? "",
      referral.referredOrganizationName ?? "",
      referral.referralCode,
      referralStatusLabels[referral.status],
      "",
      "",
      "",
      "",
    ]),
    ...data.payouts.map((payout) => [
      "payout",
      "",
      "",
      "",
      "",
      payoutStatusLabels[payout.status],
      payout.milestone,
      payout.amountCents,
      payout.currency,
      payout.notes ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="olea-referrals.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
