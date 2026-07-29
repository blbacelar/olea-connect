import { NextResponse } from "next/server";

import {
  getAppUrl,
  getEmailRecipient,
  getEmailSender,
  getReplyTo,
  getResend,
} from "@/lib/email/server";
import { hasClaimedEmailEvent } from "@/lib/email/config";
import {
  eventScheduleChangeEmail,
  boardRecruitmentSurveyInvitationEmail,
  teamInvitationEmail,
  type TransactionalEmail,
} from "@/lib/email/templates";
import {
  getRequestContext,
  logCritical,
  logError,
  logInfo,
  logWarn,
} from "@/lib/observability/logger";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
};

async function buildEmail(
  supabase: ReturnType<typeof createAdminClient>,
  event: {
    event_type: string;
    payload: unknown;
  },
): Promise<{ email: TransactionalEmail; recipientEmail: string }> {
  if (event.event_type === "organization.invitation.created") {
    const payload = event.payload as {
      email: string;
      role: string;
      expires_at: string;
      accept_path: string;
      organization_id: string;
    };
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", payload.organization_id)
      .single();
    if (organizationError) throw organizationError;

    return {
      recipientEmail: payload.email,
      email: teamInvitationEmail({
        organizationName: organization.name,
        role: payload.role,
        expiresAt: payload.expires_at,
        acceptUrl: new URL(payload.accept_path, getAppUrl()).toString(),
      }),
    };
  }

  if (
    event.event_type === "event.canceled" ||
    event.event_type === "event.rescheduled"
  ) {
    const payload = event.payload as {
      event_title: string;
      starts_at: string;
      timezone: string;
      recipient_email: string;
    };

    return {
      recipientEmail: payload.recipient_email,
      email: eventScheduleChangeEmail({
        eventTitle: payload.event_title,
        startsAt: payload.starts_at,
        timezone: payload.timezone,
        type: event.event_type,
        webinarsUrl: new URL("/webinars", getAppUrl()).toString(),
      }),
    };
  }

  if (event.event_type === "board_recruitment.survey_invitation") {
    const payload = event.payload as {
      recipient_email: string;
      organization_name: string;
      member_name: string;
      survey_year: number;
      invitation_path: string;
      expires_at: string;
    };

    return {
      recipientEmail: payload.recipient_email,
      email: boardRecruitmentSurveyInvitationEmail({
        organizationName: payload.organization_name,
        memberName: payload.member_name,
        surveyYear: payload.survey_year,
        surveyUrl: new URL(payload.invitation_path, getAppUrl()).toString(),
        expiresAt: payload.expires_at,
      }),
    };
  }

  throw new Error(`Unsupported email event: ${event.event_type}`);
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  const requestContext = getRequestContext(request, {
    component: "email_worker",
    provider: "email",
  });

  if (!isAuthorized(request)) {
    logWarn("Email worker rejected unauthorized request", requestContext);
    return NextResponse.json(
      { error: "Unauthorized." },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  const supabase = createAdminClient();
  const { data: event, error: claimError } = await supabase.rpc(
    "claim_email_integration_event",
  );
  if (claimError) {
    logCritical(
      "Unable to claim email integration event",
      claimError,
      requestContext,
    );
    return NextResponse.json(
      { error: "Email worker could not claim an event." },
      { headers: noStoreHeaders, status: 500 },
    );
  }
  if (!hasClaimedEmailEvent(event)) {
    logInfo("Email worker found no queued event", requestContext);
    return NextResponse.json({ processed: false }, { headers: noStoreHeaders });
  }

  try {
    const eventContext = {
      ...requestContext,
      eventId: event.id,
      eventType: event.event_type,
    };
    const { email, recipientEmail } = await buildEmail(supabase, event);
    const recipient = getEmailRecipient(recipientEmail);
    const { data, error } = await getResend().emails.send({
      from: getEmailSender(),
      replyTo: getReplyTo(),
      to: recipient,
      subject: email.subject,
      html: email.html,
      text:
        recipient === recipientEmail
          ? email.text
          : `[Non-production email for ${recipientEmail}]\n\n${email.text}`,
      tags: [
        { name: "event_type", value: event.event_type.replace(/\./g, "_") },
        { name: "environment", value: process.env.VERCEL_ENV ?? "development" },
      ],
    });
    if (error || !data?.id)
      throw new Error(error?.message ?? "No email ID returned.");

    const { error: updateError } = await supabase
      .from("integration_events")
      .update({
        status: "completed",
        provider_message_id: data.id,
        processing_started_at: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    if (updateError) throw updateError;

    logInfo("Email integration event processed", {
      ...eventContext,
      providerMessageId: data.id,
    });
    return NextResponse.json(
      { processed: true, eventId: event.id },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    await supabase
      .from("integration_events")
      .update({
        status: event.attempts >= 5 ? "dead_letter" : "failed",
        processing_started_at: null,
        last_error: message,
        available_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq("id", event.id);
    logCritical("Unable to process email integration event", error, {
      ...requestContext,
      eventId: event.id,
      eventType: event.event_type,
    });
    return NextResponse.json(
      { error: "Email delivery failed." },
      { headers: noStoreHeaders, status: 500 },
    );
  }
}

export const POST = GET;
