import { NextRequest, NextResponse } from "next/server";

import { normalizeReferralCode } from "@/lib/referral-capture";
import { createAdminClient } from "@/utils/supabase/admin";

const referralCookieName = "olea_referral_code";
const referralCookieMaxAge = 60 * 60 * 24 * 30;

export const dynamic = "force-dynamic";

async function isActiveShareCode(code: string) {
  const supabase = createAdminClient({ noStore: true });
  const { data, error } = await supabase
    .from("referral_links")
    .select("id, referrers(status)")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error) return false;
  if (!data) {
    const trackingCode = await supabase
      .from("referral_tracking_codes")
      .select("code")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    return !trackingCode.error && Boolean(trackingCode.data);
  }
  const referrer = Array.isArray(data.referrers)
    ? data.referrers[0]
    : data.referrers;
  return referrer?.status === "approved";
}

export async function GET(_request: NextRequest, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const code = normalizeReferralCode(params.code);
  const validCode = code ? await isActiveShareCode(code) : false;
  const redirectUrl = new URL(
    validCode
      ? `/signup?ref=${encodeURIComponent(code)}`
      : "/referrals?referral=invalid",
    _request.url,
  );
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  const secureCookie = _request.nextUrl.protocol === "https:";

  if (validCode) {
    response.cookies.set(referralCookieName, code, {
      httpOnly: false,
      maxAge: referralCookieMaxAge,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
    });
  } else {
    response.cookies.set(referralCookieName, "", {
      httpOnly: false,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
    });
  }

  return response;
}
