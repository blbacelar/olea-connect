import { NextResponse } from "next/server";

import { getCircleConfig } from "@/lib/circle/config";
import { buildCircleSsoUrl, createCircleSsoToken } from "@/lib/circle/sso";
import { requireMemberContext } from "@/lib/data/member-context";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

export async function GET() {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return NextResponse.redirect(
      new URL(
        "/subscription",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }

  const config = getCircleConfig();
  const token = createCircleSsoToken(
    {
      email: member.email,
      name: member.name,
      externalId: member.id,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationRole: member.membershipRole,
      tier: organization.tier,
    },
    config.ssoSecret,
  );

  return NextResponse.redirect(buildCircleSsoUrl(config.communityUrl, token));
}
