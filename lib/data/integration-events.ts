import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const integrationAdminRoles = ["super_admin"] as const;
const sensitiveKeyPattern =
  /token|secret|password|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|signature/i;

export type IntegrationEventStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead_letter";

export type IntegrationEventSummary = {
  id: string;
  provider: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  status: IntegrationEventStatus;
  attempts: number;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  providerMessageId: string | null;
  lastError: string | null;
  idempotencyKey: string | null;
  payloadPreview: unknown;
};

type IntegrationEventRow = {
  id: string;
  provider: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  status: IntegrationEventStatus;
  attempts: number;
  available_at: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  idempotency_key: string | null;
  payload: unknown;
};

export async function requireIntegrationAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before viewing integration operations.");

  const admin = createAdminClient();
  const { data: role, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...integrationAdminRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!role) {
    throw new Error("Only platform administrators can view integration operations.");
  }

  return { admin, userId: user.id };
}

function redactPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactPayload(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : redactPayload(item),
    ]),
  );
}

function mapIntegrationEvent(row: IntegrationEventRow): IntegrationEventSummary {
  return {
    id: row.id,
    provider: row.provider,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    status: row.status,
    attempts: row.attempts,
    availableAt: row.available_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    providerMessageId: row.provider_message_id,
    lastError: row.last_error,
    idempotencyKey: row.idempotency_key,
    payloadPreview: redactPayload(row.payload),
  };
}

export async function getIntegrationOperations() {
  const { admin } = await requireIntegrationAdmin();
  const { data, error } = await admin
    .from("integration_events")
    .select(
      "id, provider, event_type, aggregate_type, aggregate_id, status, attempts, available_at, created_at, updated_at, completed_at, provider_message_id, last_error, idempotency_key, payload",
    )
    .in("provider", ["email", "attio", "quickbooks"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const events = ((data ?? []) as IntegrationEventRow[]).map(mapIntegrationEvent);
  const counts = events.reduce<Record<IntegrationEventStatus, number>>(
    (accumulator, event) => {
      accumulator[event.status] += 1;
      return accumulator;
    },
    {
      completed: 0,
      dead_letter: 0,
      failed: 0,
      pending: 0,
      processing: 0,
    },
  );

  return {
    counts,
    events,
    replayableEvents: events.filter((event) =>
      ["failed", "dead_letter"].includes(event.status),
    ),
  };
}
