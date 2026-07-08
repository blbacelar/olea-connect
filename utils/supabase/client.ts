import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { parse, serialize } from "cookie";

import {
  applyAuthCookieDuration,
  AUTH_REMEMBER_COOKIE_NAME,
  AUTH_REMEMBER_MAX_AGE_SECONDS,
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

      document.cookie = serialize(
        AUTH_REMEMBER_COOKIE_NAME,
        rememberFor30Days ? "1" : "",
        rememberFor30Days
          ? {
              maxAge: AUTH_REMEMBER_MAX_AGE_SECONDS,
              path: "/",
              sameSite: "lax",
            }
          : {
              maxAge: 0,
              path: "/",
              sameSite: "lax",
            },
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
          isSingleton: false,
        }
      : undefined,
  );
}
