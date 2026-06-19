import { NextResponse } from "next/server";

import { attemptUserWorkspaceProvisioning } from "@/lib/stripe/registration";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function getSafeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function shouldSkipProvisioning(next: string) {
  return next.startsWith("/update-password");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (shouldSkipProvisioning(next)) {
          return NextResponse.redirect(new URL(next, url.origin));
        }

        try {
          const result = await attemptUserWorkspaceProvisioning(
            createAdminClient(),
            user.id,
          );

          if (result?.status === "completed") {
            return NextResponse.redirect(
              new URL("/onboarding/brand-setup", url.origin),
            );
          }

          if (
            result?.status === "pending_payment" ||
            result?.status === "pending_verification"
          ) {
            return NextResponse.redirect(
              new URL("/signup/success?activation=pending", url.origin),
            );
          }

          if (result?.status !== "failed") {
            return NextResponse.redirect(new URL(next, url.origin));
          }
        } catch (provisioningError) {
          console.error(
            "Unable to complete workspace provisioning after verification",
            provisioningError,
          );
        }

        const activationUrl = new URL("/signup/success", url.origin);
        activationUrl.searchParams.set("activation", "failed");
        return NextResponse.redirect(activationUrl);
      }

      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set(
    "error",
    "This authentication link is invalid or has expired.",
  );
  return NextResponse.redirect(loginUrl);
}
