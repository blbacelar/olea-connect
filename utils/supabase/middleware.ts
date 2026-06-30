import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const publicPagePaths = new Set([
  "/",
  "/login",
  "/reset-password",
  "/update-password",
  "/verify-email",
]);

const publicPathPrefixes = [
  "/auth",
  "/signup",
  "/api",
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
  let response = NextResponse.next({ request });

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

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
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

    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
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

      const redirectResponse = NextResponse.redirect(subscriptionUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return response;
}
