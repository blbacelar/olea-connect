const REFERRAL_COOKIE = "olea_referral_code";
const REFERRAL_STORAGE_KEY = "olea-referral-code";

export function normalizeReferralCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^OLEA-[A-Z0-9]{6,16}$/.test(normalized) ? normalized : "";
}

export function captureReferralCodeFromUrl() {
  if (typeof window === "undefined") return "";

  const existing = normalizeReferralCode(
    window.localStorage.getItem(REFERRAL_STORAGE_KEY),
  );
  const query = normalizeReferralCode(
    new URLSearchParams(window.location.search).get("ref"),
  );
  const captured = existing || query;
  if (!captured) return "";

  if (!existing) {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, captured);
    document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(captured)}; Max-Age=2592000; Path=/; SameSite=Lax`;
  }
  return captured;
}
