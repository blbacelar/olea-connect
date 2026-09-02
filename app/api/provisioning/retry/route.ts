import { NextResponse } from "next/server";

import { getPostActivationPath } from "@/lib/onboarding/post-activation";
import { attemptUserWorkspaceProvisioning } from "@/lib/stripe/registration";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to retry membership activation." },
      { status: 401 },
    );
  }

  try {
    const admin = createAdminClient();
    const result = await attemptUserWorkspaceProvisioning(
      admin,
      user.id,
    );

    if (!result) {
      return NextResponse.json({
        status: "not_found",
        error: "No membership activation was found for this account.",
      });
    }

    const nextPath =
      result.status === "completed"
        ? await getPostActivationPath(admin, result.organization_id)
        : undefined;

    return NextResponse.json({ ...result, nextPath }, {
      status: result.status === "failed" ? 409 : 200,
    });
  } catch (error) {
    console.error("Unable to retry workspace provisioning", error);
    return NextResponse.json(
      { error: "Activation could not be retried. Please try again shortly." },
      { status: 500 },
    );
  }
}
