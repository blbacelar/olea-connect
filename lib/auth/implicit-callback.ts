import { getSafeNextPath } from "@/lib/auth/safe-next-path";

export function parseImplicitAuthCallback(search: string, hash: string) {
  const tokens = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = tokens.get("access_token");
  const refreshToken = tokens.get("refresh_token");

  if (!accessToken || !refreshToken) return null;

  const fallback = tokens.get("type") === "signup"
    ? "/signup/success?activation=pending_payment"
    : "/dashboard";

  return {
    accessToken,
    refreshToken,
    next: getSafeNextPath(new URLSearchParams(search).get("next"), fallback),
  };
}
