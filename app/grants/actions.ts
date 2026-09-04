"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  assertGrantAwardStatus,
  getBoolean,
  getMoneyCents,
  getText,
  requireGrantsAdmin,
} from "./grant-action-utils";
import { saveGrantApplicationFromForm } from "./grant-application-action";
import { reviewGrantApplicationFromForm } from "./grant-review-action";

export async function saveGrantApplication(formData: FormData) {
  await saveGrantApplicationFromForm(formData);
}

export async function withdrawGrantApplication(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const { organization } = await requireMemberContext();
  const admin = createAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("grant_applications")
    .select("id, organization_id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (application.organization_id !== organization.id) {
    throw new Error("This application belongs to another organization.");
  }
  if (!["draft", "submitted", "in_review", "shortlisted"].includes(application.status)) {
    throw new Error("This application can no longer be withdrawn.");
  }

  const { error } = await admin
    .from("grant_applications")
    .update({
      status: "withdrawn",
      withdrawn_at: new Date().toISOString(),
    })
    .eq("id", application.id)
    .eq("organization_id", organization.id)
    .in("status", ["draft", "submitted", "in_review", "shortlisted"])
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/grants");
}

export async function reviewGrantApplication(formData: FormData) {
  await reviewGrantApplicationFromForm(formData);
}

export async function awardGrantApplication(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const amountCents = getMoneyCents(formData, "awardAmount");
  await requireGrantsAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_grant_award", {
    target_amount_cents: amountCents,
    target_application_id: applicationId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/grants");
}

export async function updateGrantAward(formData: FormData) {
  const awardId = getText(formData, "awardId");
  const status = getText(formData, "awardStatus");
  const paymentReference = getText(formData, "paymentReference");
  const { admin } = await requireGrantsAdmin();

  assertGrantAwardStatus(status);

  const values: {
    paid_on: string | null;
    status: string;
    payment_reference?: string | null;
  } = {
    paid_on: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
    status,
  };

  if (paymentReference) {
    values.payment_reference = paymentReference;
  }

  const { error } = await admin
    .from("grant_awards")
    .update(values)
    .eq("id", awardId);

  if (error) throw error;
  revalidatePath("/grants");
}

export async function saveImpactStory(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const impactStory = getText(formData, "impactStory");
  const { organization } = await requireMemberContext();
  const admin = createAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("grant_applications")
    .select("id, organization_id, grant_awards(id, status)")
    .eq("id", applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (application.organization_id !== organization.id) {
    throw new Error("This application belongs to another organization.");
  }

  const award = Array.isArray(application.grant_awards)
    ? application.grant_awards[0]
    : application.grant_awards;

  if (!award || award.status === "canceled") {
    throw new Error("No active award exists for this application.");
  }

  const { error } = await admin
    .from("grant_awards")
    .update({
      impact_story: impactStory || null,
      impact_story_consent: getBoolean(formData, "impactStoryConsent"),
      outcome_received_at: impactStory ? new Date().toISOString() : null,
    })
    .eq("id", award.id);

  if (error) throw error;
  revalidatePath("/grants");
}
