import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAttioConfig } from "@/lib/attio/config";
import {
  completeIntegrationEvent,
  type IntegrationEvent,
} from "@/lib/integrations/outbox";
import type { MembershipTier, OrganizationRole } from "@/lib/types";

export interface AttioMemberSyncPayload {
  email: string;
  name: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  organization_role: OrganizationRole;
  tier: MembershipTier;
  subscription_status: string;
  billing_interval: "month" | "year";
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  reason: string;
}

interface AttioRecordResponse {
  data?: {
    id?: {
      record_id?: string;
    };
  };
}

function isAttioRecordResponse(value: unknown): value is AttioRecordResponse {
  return Boolean(value && typeof value === "object" && "data" in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function getExistingAttioSettings(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organization_integrations")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("provider", "attio")
    .maybeSingle();

  if (error) throw error;
  return isRecord(data?.settings) ? data.settings : {};
}

export function buildAttioMemberPayload(
  payload: AttioMemberSyncPayload,
) {
  return {
    data: {
      values: {
        name: [{ full_name: payload.name }],
        email_addresses: [{ email_address: payload.email }],
        description: [
          {
            value: [
              `Olea organization: ${payload.organization_name}`,
              `Tier: ${payload.tier}`,
              `Role: ${payload.organization_role}`,
              `Subscription: ${payload.subscription_status}`,
            ].join("\n"),
          },
        ],
      },
    },
  };
}

export async function enqueueAttioMemberSync(
  supabase: SupabaseClient,
  payload: AttioMemberSyncPayload,
) {
  if (!payload.email.trim()) {
    throw new Error("Attio member sync requires an email address.");
  }

  const idempotencyKey = [
    "attio",
    "member",
    payload.organization_id,
    payload.user_id,
    payload.reason,
    createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  ].join(":");

  const { error } = await supabase.from("integration_events").upsert(
    {
      event_type: "attio.member.upsert",
      aggregate_type: "organization_member",
      aggregate_id: `${payload.organization_id}:${payload.user_id}`,
      provider: "attio",
      payload,
      status: "pending",
      attempts: 0,
      available_at: new Date().toISOString(),
      locked_at: null,
      completed_at: null,
      last_error: null,
      idempotency_key: idempotencyKey,
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );

  if (error) throw error;
}

async function upsertAttioPerson(payload: AttioMemberSyncPayload) {
  const config = getAttioConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/v2/objects/people/records?matching_attribute=email_addresses`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildAttioMemberPayload(payload)),
    },
  );
  const data = (await response.json().catch(() => null)) as
    | AttioRecordResponse
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      data && "message" in data && data.message
        ? data.message
        : `Attio API request failed with ${response.status}.`;
    throw new Error(message);
  }

  return isAttioRecordResponse(data) ? data.data?.id?.record_id ?? null : null;
}

export async function processAttioIntegrationEvent(
  supabase: SupabaseClient,
  event: IntegrationEvent<AttioMemberSyncPayload>,
) {
  if (event.event_type !== "attio.member.upsert") {
    throw new Error(`Unsupported Attio event: ${event.event_type}`);
  }

  const providerRecordId = await upsertAttioPerson(event.payload);
  const existingSettings = await getExistingAttioSettings(
    supabase,
    event.payload.organization_id,
  );
  const existingMemberRecordIds = isRecord(
    existingSettings.member_record_ids,
  )
    ? existingSettings.member_record_ids
    : {};
  const memberRecordIds = {
    ...existingMemberRecordIds,
    ...(providerRecordId
      ? { [event.payload.user_id]: providerRecordId }
      : {}),
  };
  const { error: integrationError } = await supabase
    .from("organization_integrations")
    .upsert(
      {
        organization_id: event.payload.organization_id,
        provider: "attio",
        external_id: event.payload.organization_id,
        status: "active",
        settings: {
          ...existingSettings,
          member_record_ids: memberRecordIds,
          last_synced_user_id: event.payload.user_id,
          last_synced_email: event.payload.email,
          last_synced_record_id: providerRecordId,
          last_synced_tier: event.payload.tier,
          last_reason: event.payload.reason,
          last_synced_at: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,provider" },
    );

  if (integrationError) throw integrationError;
  await completeIntegrationEvent(supabase, event.id, providerRecordId);
}
