import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const integrationAdminRoles = ["super_admin"] as const;
const sensitiveKeyPattern =
  /token|secret|password|authorization|cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|signature|payload|document|content|html|text|body|description|notes/i;

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

export type WebhookEventSummary = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  receivedAt: string;
  processedAt: string | null;
  processingError: string | null;
  attempts: number;
  payloadPreview: unknown;
};

export type IntegrationOperationsFilters = {
  provider?: string;
  query?: string;
  status?: IntegrationEventStatus | "all";
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

type WebhookEventRow = {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
  attempts: number;
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

function mapWebhookEvent(row: WebhookEventRow): WebhookEventSummary {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.provider_event_id,
    eventType: row.event_type,
    receivedAt: row.received_at,
    processedAt: row.processed_at,
    processingError: row.processing_error,
    attempts: row.attempts,
    payloadPreview: redactPayload(row.payload),
  };
}

function normalizeFilter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0]?.trim() : value?.trim();
}

function eventMatchesQuery(
  event: IntegrationEventSummary | WebhookEventSummary,
  query: string,
) {
  const searchable =
    "aggregateId" in event
      ? [
          event.id,
          event.provider,
          event.eventType,
          event.aggregateType,
          event.aggregateId,
          event.providerMessageId,
          event.idempotencyKey,
          event.lastError,
        ]
      : [
          event.id,
          event.provider,
          event.providerEventId,
          event.eventType,
          event.processingError,
        ];

  const normalizedQuery = query.toLowerCase();
  return searchable.some((value) =>
    String(value ?? "").toLowerCase().includes(normalizedQuery),
  );
}

export async function getIntegrationOperations(
  filters: IntegrationOperationsFilters = {},
) {
  const { admin } = await requireIntegrationAdmin();
  const provider = normalizeFilter(filters.provider);
  const status = normalizeFilter(filters.status);
  const query = normalizeFilter(filters.query)?.toLowerCase();

  let integrationQuery = admin
    .from("integration_events")
    .select(
      "id, provider, event_type, aggregate_type, aggregate_id, status, attempts, available_at, created_at, updated_at, completed_at, provider_message_id, last_error, idempotency_key, payload",
    )
    .in("provider", ["email", "attio", "quickbooks"]);

  if (provider && provider !== "all") {
    integrationQuery = integrationQuery.eq("provider", provider);
  }

  if (status && status !== "all") {
    integrationQuery = integrationQuery.eq("status", status);
  }

  const { data, error } = await integrationQuery
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  let events = ((data ?? []) as IntegrationEventRow[]).map(mapIntegrationEvent);
  if (query) {
    events = events.filter((event) => eventMatchesQuery(event, query));
  }

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

  let webhookQuery = admin
    .from("webhook_events")
    .select(
      "id, provider, provider_event_id, event_type, received_at, processed_at, processing_error, attempts, payload",
    )
    .eq("provider", "stripe");

  if (provider && provider !== "all" && provider !== "stripe") {
    webhookQuery = webhookQuery.eq("provider", provider);
  }

  const { data: webhookData, error: webhookError } = await webhookQuery
    .order("received_at", { ascending: false })
    .limit(50);

  if (webhookError) throw webhookError;

  let webhookEvents = ((webhookData ?? []) as WebhookEventRow[]).map(
    mapWebhookEvent,
  );
  if (query) {
    webhookEvents = webhookEvents.filter((event) =>
      eventMatchesQuery(event, query),
    );
  }

  return {
    counts,
    events,
    filters: {
      provider: provider ?? "all",
      query: query ?? "",
      status: status ?? "all",
    },
    replayableEvents: events.filter((event) =>
      ["failed", "dead_letter"].includes(event.status),
    ),
    webhookEvents,
  };
}
