import { createServerClient } from "@supabase/ssr";
import { parse } from "cookie";
import { NextResponse } from "next/server";

import { getPostActivationPath } from "@/lib/onboarding/post-activation";
import { attemptUserWorkspaceProvisioning } from "@/lib/stripe/registration";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  applyAuthCookieDuration,
  AUTH_REMEMBER_COOKIE_NAME,
} from "@/utils/supabase/auth-cookie-options";

function getSafeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function shouldSkipProvisioning(next: string) {
  return next.startsWith("/update-password");
}

function getRequestOrigin(request: Request, fallbackUrl: URL) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? fallbackUrl.protocol.replace(":", "");

  const configuredOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].flatMap((value) => {
    try {
      return value ? [new URL(value).origin] : [];
    } catch {
      return [];
    }
  });
  const localTestOrigins =
    process.env.PLAYWRIGHT_TEST_ENV === "local" ||
    process.env.NODE_ENV === "test"
      ? ["http://127.0.0.1:3011", "http://localhost:3011"]
      : [];
  const allowedOrigins = new Set([
    fallbackUrl.origin,
    ...configuredOrigins,
    ...localTestOrigins,
  ]);

  if (host && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) {
    const requestOrigin = `${protocol}://${host}`;
    if (allowedOrigins.has(requestOrigin)) return requestOrigin;
  }

  return fallbackUrl.origin;
}

function createCallbackClient(request: Request) {
  const requestCookies = parse(request.headers.get("cookie") ?? "");
  const rememberFor30Days =
    requestCookies[AUTH_REMEMBER_COOKIE_NAME] === "1";
  let sessionResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(requestCookies).map(([name, value]) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet) {
          sessionResponse = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) => {
            sessionResponse.cookies.set(
              name,
              value,
              applyAuthCookieDuration(options, rememberFor30Days),
            );
          });
        },
      },
    },
  );

  function withSessionCookies(response: NextResponse) {
    sessionResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });

    return response;
  }

  return { supabase, withSessionCookies };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestOrigin = getRequestOrigin(request, url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (code) {
    const { supabase, withSessionCookies } = createCallbackClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (shouldSkipProvisioning(next)) {
          return withSessionCookies(
            NextResponse.redirect(new URL(next, requestOrigin)),
          );
        }

        try {
          const admin = createAdminClient();
          const result = await attemptUserWorkspaceProvisioning(
            admin,
            user.id,
          );

          if (result?.status === "completed") {
            return withSessionCookies(
              NextResponse.redirect(
                new URL(
                  await getPostActivationPath(admin, result.organization_id),
                  requestOrigin,
                ),
              ),
            );
          }

          if (
            result?.status === "pending_payment" ||
            result?.status === "pending_verification"
          ) {
            return withSessionCookies(
              NextResponse.redirect(
                new URL("/signup/success?activation=pending", requestOrigin),
              ),
            );
          }

          if (result?.status !== "failed") {
            return withSessionCookies(
              NextResponse.redirect(new URL(next, requestOrigin)),
            );
          }
        } catch (provisioningError) {
          console.error(
            "Unable to complete workspace provisioning after verification",
            provisioningError,
          );
        }

        const activationUrl = new URL("/signup/success", requestOrigin);
        activationUrl.searchParams.set("activation", "failed");
        return withSessionCookies(NextResponse.redirect(activationUrl));
      }

      return withSessionCookies(
        NextResponse.redirect(new URL(next, requestOrigin)),
      );
    }
  }

  const loginUrl = new URL("/login", requestOrigin);
  loginUrl.searchParams.set(
    "error",
    "This authentication link is invalid or has expired.",
  );
  return NextResponse.redirect(loginUrl);
}
