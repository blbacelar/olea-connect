import { NextResponse } from "next/server";

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
    const result = await attemptUserWorkspaceProvisioning(
      createAdminClient(),
      user.id,
    );

    if (!result) {
      return NextResponse.json(
        { error: "No membership activation was found for this account." },
        { status: 404 },
      );
    }

    return NextResponse.json(result, {
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
