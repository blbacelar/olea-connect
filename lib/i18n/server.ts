import { cookies, headers } from "next/headers";

import {
  localeCookieName,
  resolveRequestLocale,
  type Locale,
} from "@/lib/i18n/locales";

export function getRequestLocale(): Locale {
  const cookieStore = cookies();
  const headerStore = headers();

  return resolveRequestLocale({
    localeCookie: cookieStore.get(localeCookieName)?.value,
    country: headerStore.get("x-vercel-ip-country"),
    region: headerStore.get("x-vercel-ip-country-region"),
    acceptLanguage: headerStore.get("accept-language"),
  });
}
