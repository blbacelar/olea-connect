import type { CookieOptions } from "@supabase/ssr";

export const AUTH_REMEMBER_COOKIE_NAME = "olea-auth-remember";
export const AUTH_REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function applyAuthCookieDuration(
  options: CookieOptions,
  rememberFor30Days: boolean,
): CookieOptions {
  const nextOptions = { ...options };

  if (nextOptions.maxAge === 0) return nextOptions;

  if (rememberFor30Days) {
    nextOptions.maxAge = AUTH_REMEMBER_MAX_AGE_SECONDS;
    delete nextOptions.expires;
    return nextOptions;
  }

  delete nextOptions.maxAge;
  delete nextOptions.expires;
  return nextOptions;
}
