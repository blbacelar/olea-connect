import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  applyAuthCookieDuration,
  AUTH_REMEMBER_COOKIE_NAME,
} from "./auth-cookie-options";

export async function createClient() {
  const cookieStore = cookies();
  const rememberFor30Days =
    cookieStore.get(AUTH_REMEMBER_COOKIE_NAME)?.value === "1";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(
                name,
                value,
                applyAuthCookieDuration(options, rememberFor30Days),
              );
            });
          } catch {
            // Server Components cannot write cookies. Middleware handles refreshes.
          }
        },
      },
    },
  );
}
