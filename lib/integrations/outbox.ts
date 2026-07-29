import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface IntegrationEvent<TPayload> {
  id: string;
  event_type: string;
  payload: TPayload;
  attempts: number;
}

export function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export function getRetryAvailableAt(attempts: number) {
  const minutes = Math.min(60, 2 ** Math.max(attempts - 1, 0) * 5);
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export async function completeIntegrationEvent(
  supabase: SupabaseClient,
  eventId: string,
  providerMessageId?: string | null,
) {
  const { error } = await supabase
    .from("integration_events")
    .update({
      status: "completed",
      provider_message_id: providerMessageId ?? null,
      processing_started_at: null,
      completed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", eventId);

  if (error) throw error;
}

export async function failIntegrationEvent(
  supabase: SupabaseClient,
  event: IntegrationEvent<unknown>,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Unknown integration worker error";

  const { error: updateError } = await supabase
    .from("integration_events")
    .update({
      status: event.attempts >= 5 ? "dead_letter" : "failed",
      processing_started_at: null,
      last_error: message,
      available_at: getRetryAvailableAt(event.attempts),
    })
    .eq("id", event.id);

  if (updateError) throw updateError;
}
