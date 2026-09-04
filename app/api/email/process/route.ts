import { NextResponse } from "next/server";

import {
  getEmailRecipient,
  getEmailSender,
  getReplyTo,
  getResend,
} from "@/lib/email/server";
import { hasClaimedEmailEvent } from "@/lib/email/config";
import { buildEmail } from "@/lib/email/event-builder";
import {
  getRequestContext,
  logCritical,
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

type QueuedEmailEvent = {
  event_type: string;
  payload: unknown;
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

async function claimEmailEvent(
  supabase: ReturnType<typeof createAdminClient>,
  requestContext: Record<string, unknown>,
) {
  const { data: event, error: claimError } = await supabase.rpc(
    "claim_email_integration_event",
  );

  if (claimError) {
    logCritical(
      "Unable to claim email integration event",
      claimError,
      requestContext,
    );
    return {
      response: NextResponse.json(
        { error: "Email worker could not claim an event." },
        { headers: noStoreHeaders, status: 500 },
      ),
    };
  }

  if (!hasClaimedEmailEvent(event)) {
    logInfo("Email worker found no queued event", requestContext);
    return {
      response: NextResponse.json(
        { processed: false },
        { headers: noStoreHeaders },
      ),
    };
  }

  return { event };
}

async function processEmailEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: QueuedEmailEvent & { id: string },
  requestContext: Record<string, unknown>,
) {
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
}

async function markEmailEventFailed(
  supabase: ReturnType<typeof createAdminClient>,
  event: QueuedEmailEvent & { id: string; attempts: number },
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "Unknown email error";

  await supabase
    .from("integration_events")
    .update({
      status: event.attempts >= 5 ? "dead_letter" : "failed",
      processing_started_at: null,
      last_error: message,
      available_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .eq("id", event.id);
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
  const claimed = await claimEmailEvent(supabase, requestContext);
  if (claimed.response) return claimed.response;
  const { event } = claimed;

  try {
    await processEmailEvent(supabase, event, requestContext);
    return NextResponse.json(
      { processed: true, eventId: event.id },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    await markEmailEventFailed(supabase, event, error);
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
