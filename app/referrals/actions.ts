"use server";

import { revalidatePath } from "next/cache";

import {
  getReferralProgramSettings,
  referralProgramSettingsDefaults,
} from "@/lib/data/referrals";
import { getReferralPageCopy } from "@/lib/i18n/referral-page-copy";
import { defaultLocale, normalizeLocale } from "@/lib/i18n/locales";
import { referralApplicationSchema } from "@/lib/referrals/domain";
import { createAdminClient } from "@/utils/supabase/admin";

export type ReferralApplicationState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function getReferralActionCopy(formData: FormData) {
  const rawLocale = formData.get("locale");
  const locale =
    normalizeLocale(typeof rawLocale === "string" ? rawLocale : null) ??
    defaultLocale;
  return getReferralPageCopy(locale).action;
}

function localizeFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
  copy: ReturnType<typeof getReferralActionCopy>,
) {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, errors]) => [
      field,
      errors?.length
        ? [copy.fieldErrors[field] ?? errors[0] ?? copy.reviewFields]
        : errors,
    ]),
  );
}

async function enqueueReferralEmail(input: {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("integration_events").upsert(
    {
      event_type: input.eventType,
      aggregate_type: "referral_program",
      aggregate_id: input.aggregateId,
      provider: "email",
      payload: input.payload,
      idempotency_key: input.idempotencyKey,
    },
    { onConflict: "idempotency_key" },
  );

  if (error) throw error;
}

export async function applyToReferralProgram(
  _previousState: ReferralApplicationState,
  formData: FormData,
): Promise<ReferralApplicationState> {
  const copy = getReferralActionCopy(formData);
  const formValues = formDataToObject(formData);
  delete formValues.locale;

  const parsed = referralApplicationSchema.safeParse(formValues);
  if (!parsed.success) {
    return {
      ok: false,
      message: copy.reviewFields,
      fieldErrors: localizeFieldErrors(
        parsed.error.flatten().fieldErrors,
        copy,
      ),
    };
  }

  const supabase = createAdminClient();
  const settings = await getReferralProgramSettings().catch(
    () => referralProgramSettingsDefaults,
  );
  if (!settings.programEnabled) {
    return {
      ok: false,
      message: copy.programPaused,
    };
  }

  const input = parsed.data;
  const email = input.email.toLowerCase();
  const values = {
    full_name: input.fullName,
    email,
    organization_name: input.organizationName || null,
    relationship_to_olea: input.relationshipToOlea,
    payout_contact: input.payoutContact,
    terms_accepted: true,
    status: "pending",
    status_reason: null,
  };

  const { data: existing, error: existingError } = await supabase
    .from("referrers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: copy.initialError };
  }

  if (existing && existing.status !== "pending") {
    return {
      ok: true,
      message: copy.duplicateReceived,
    };
  }

  const { data, error } = existing
    ? await supabase
        .from("referrers")
        .update(values)
        .eq("id", existing.id)
        .select("id, status")
        .single()
    : await supabase
        .from("referrers")
        .insert(values)
        .select("id, status")
        .single();

  if (error) {
    return { ok: false, message: copy.initialError };
  }

  try {
    await enqueueReferralEmail({
      eventType: "referral.application.submitted",
      aggregateId: data.id,
      idempotencyKey: `referral.application.submitted:${data.id}`,
      payload: {
        recipient_email: email,
        full_name: input.fullName,
        status: data.status,
      },
    });
    await enqueueReferralEmail({
      eventType: "referral.application.received",
      aggregateId: data.id,
      idempotencyKey: `referral.application.received:${data.id}`,
      payload: {
        recipient_email: settings.contactEmail,
        referrer_id: data.id,
        full_name: input.fullName,
        email,
        organization_name: input.organizationName,
      },
    });
  } catch {
    // The application is still saved. Email worker observability will surface delivery issues.
  }

  const { error: auditError } = await supabase
    .from("referral_audit_events")
    .insert({
      referrer_id: data.id,
      event_type: "application_submitted",
      message: "Referral application submitted.",
    });
  if (auditError) {
    console.error("Unable to record referral application audit event", {
      referrerId: data.id,
    });
  }

  revalidatePath("/referrals");
  return {
    ok: true,
    message: copy.submitted,
  };
}
