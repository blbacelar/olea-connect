import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";

import {
  applyAuthCookieDuration,
  AUTH_REMEMBER_COOKIE_NAME,
} from "./auth-cookie-options";

const publicPagePaths = new Set([
  "/",
  "/sponsorship",
  "/login",
  "/reset-password",
  "/opengraph-image",
  "/twitter-image",
  "/robots.txt",
  "/sitemap.xml",
  "/update-password",
  "/verify-email",
]);

const publicPathPrefixes = [
  "/auth",
  "/signup",
  "/api",
  "/legal",
  "/modules/board-recruitment/survey",
];

function isPathOrChild(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string) {
  return (
    publicPagePaths.has(pathname) ||
    publicPathPrefixes.some((prefix) => isPathOrChild(pathname, prefix))
  );
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = getOrCreateRequestId(requestHeaders);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  function createResponse() {
    const nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    nextResponse.headers.set(REQUEST_ID_HEADER, requestId);
    return nextResponse;
  }

  function copySessionCookies(target: NextResponse) {
    response.cookies.getAll().forEach((cookie) => {
      target.cookies.set(cookie);
    });
    target.headers.set(REQUEST_ID_HEADER, requestId);
    return target;
  }

  let response = createResponse();
  const rememberFor30Days =
    request.cookies.get(AUTH_REMEMBER_COOKIE_NAME)?.value === "1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = createResponse();

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(
              name,
              value,
              applyAuthCookieDuration(options, rememberFor30Days),
            );
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);
  const billingRecoveryPath = pathname.startsWith("/subscription");

  if (!user && !publicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return copySessionCookies(NextResponse.redirect(loginUrl));
  }

  if (user && !publicPath && !billingRecoveryPath) {
    const { data: hasSubscription, error } = await supabase.rpc(
      "has_current_subscription",
    );

    if (!error && !hasSubscription) {
      const subscriptionUrl = request.nextUrl.clone();
      subscriptionUrl.pathname = "/subscription";
      subscriptionUrl.search = "";
      subscriptionUrl.searchParams.set("billing", "required");

      return copySessionCookies(NextResponse.redirect(subscriptionUrl));
    }
  }

  return response;
}
