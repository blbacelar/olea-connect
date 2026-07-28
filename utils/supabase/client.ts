import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { parse, serialize } from "cookie";

import {
  applyAuthCookieDuration,
  AUTH_REMEMBER_COOKIE_NAME,
  getRememberPreferenceCookieOptions,
} from "./auth-cookie-options";

type CreateClientOptions = {
  rememberFor30Days?: boolean;
};

function createRememberAwareCookies(rememberFor30Days: boolean) {
  return {
    getAll() {
      const parsedCookies = parse(document.cookie);

      return Object.entries(parsedCookies).map(([name, value]) => ({
        name,
        value: value ?? "",
      }));
    },
    setAll(
      cookiesToSet: {
        name: string;
        value: string;
        options: CookieOptions;
      }[],
    ) {
      cookiesToSet.forEach(({ name, value, options }) => {
        document.cookie = serialize(
          name,
          value,
          applyAuthCookieDuration(options ?? {}, rememberFor30Days),
        );
      });

      // Keep the preference separate from Supabase's chunked session cookies.
      // Middleware reads this marker before refreshing the session so the
      // selected persistence policy survives navigation and reloads.
      document.cookie = serialize(
        AUTH_REMEMBER_COOKIE_NAME,
        rememberFor30Days ? "1" : "",
        getRememberPreferenceCookieOptions(rememberFor30Days),
      );
    },
  };
}

export function createClient(options?: CreateClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    options
      ? {
          cookies: createRememberAwareCookies(
            Boolean(options.rememberFor30Days),
          ),
          auth: {
            // Session persistence is handled by the cookie adapter above so
            // both checked and unchecked modes use the same SSR auth flow.
            persistSession: true,
          },
          isSingleton: false,
        }
      : undefined,
  );
}
