import { cookies, headers } from "next/headers";

import {
  localeCookieName,
  resolveRequestLocale,
  type Locale,
} from "@/lib/i18n/locales";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([await cookies(), await headers()]);

  return resolveRequestLocale({
    localeCookie: cookieStore.get(localeCookieName)?.value,
    country: headerStore.get("x-vercel-ip-country"),
    region: headerStore.get("x-vercel-ip-country-region"),
    acceptLanguage: headerStore.get("accept-language"),
  });
}
