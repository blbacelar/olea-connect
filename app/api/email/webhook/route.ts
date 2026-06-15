import { NextResponse } from "next/server";

import { getResend } from "@/lib/email/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json(
      { error: "Missing Resend webhook signature." },
      { status: 400 },
    );
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Resend webhook is not configured." },
      { status: 503 },
    );
  }

  try {
    const payload = await request.text();
    const event = getResend().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    }) as {
      type: string;
      data: { email_id?: string };
    };
    const supabase = createAdminClient();
    const providerMessageId = event.data.email_id;

    const { error: webhookError } = await supabase
      .from("webhook_events")
      .upsert(
        {
          provider: "resend",
          provider_event_id: id,
          event_type: event.type,
          payload: event,
          processed_at: new Date().toISOString(),
        },
        { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
      );
    if (webhookError) throw webhookError;

    if (
      providerMessageId &&
      ["email.bounced", "email.complained", "email.delivery_delayed"].includes(
        event.type,
      )
    ) {
      const { error } = await supabase
        .from("integration_events")
        .update({
          status: event.type === "email.delivery_delayed" ? "failed" : "dead_letter",
          last_error: `Resend reported ${event.type}.`,
        })
        .eq("provider", "email")
        .eq("provider_message_id", providerMessageId);
      if (error) throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Invalid Resend webhook", error);
    return NextResponse.json(
      { error: "Invalid Resend webhook signature." },
      { status: 400 },
    );
  }
}
