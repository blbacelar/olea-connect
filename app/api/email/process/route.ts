import { NextResponse } from "next/server";

import {
  getAppUrl,
  getEmailRecipient,
  getEmailSender,
  getReplyTo,
  getResend,
} from "@/lib/email/server";
import { teamInvitationEmail } from "@/lib/email/templates";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: event, error: claimError } = await supabase.rpc(
    "claim_email_integration_event",
  );
  if (claimError) throw claimError;
  if (!event) return NextResponse.json({ processed: false });

  try {
    if (event.event_type !== "organization.invitation.created") {
      throw new Error(`Unsupported email event: ${event.event_type}`);
    }

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

    const email = teamInvitationEmail({
      organizationName: organization.name,
      role: payload.role,
      expiresAt: payload.expires_at,
      acceptUrl: new URL(payload.accept_path, getAppUrl()).toString(),
    });
    const recipient = getEmailRecipient(payload.email);
    const { data, error } = await getResend().emails.send({
      from: getEmailSender(),
      replyTo: getReplyTo(),
      to: recipient,
      subject: email.subject,
      html: email.html,
      text:
        recipient === payload.email
          ? email.text
          : `[Non-production email for ${payload.email}]\n\n${email.text}`,
      tags: [
        { name: "event_type", value: event.event_type.replace(/\./g, "_") },
        { name: "environment", value: process.env.VERCEL_ENV ?? "development" },
      ],
    });
    if (error || !data?.id) throw new Error(error?.message ?? "No email ID returned.");

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

    return NextResponse.json({ processed: true, eventId: event.id });
  } catch (error) {
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
    console.error(`Unable to process email event ${event.id}`, error);
    return NextResponse.json({ error: "Email delivery failed." }, { status: 500 });
  }
}
