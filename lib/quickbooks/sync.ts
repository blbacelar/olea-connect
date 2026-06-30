import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  completeIntegrationEvent,
  type IntegrationEvent,
} from "@/lib/integrations/outbox";
import { getQuickBooksConfig } from "@/lib/quickbooks/config";
import type { MembershipTier } from "@/lib/types";

export interface QuickBooksCustomerSyncPayload {
  organization_id: string;
  organization_name: string;
  legal_name: string | null;
  primary_email: string | null;
  country_code: string | null;
  province_or_region: string | null;
  tier: MembershipTier;
  subscription_status: string;
  billing_interval: "month" | "year";
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  reason: string;
}

interface QuickBooksCustomer {
  Id: string;
  SyncToken?: string;
  DisplayName?: string;
}

interface QuickBooksCustomerResponse {
  Customer?: QuickBooksCustomer;
  QueryResponse?: {
    Customer?: QuickBooksCustomer[];
  };
  Fault?: {
    Error?: Array<{ Message?: string; Detail?: string }>;
  };
}

function escapeQuickBooksQueryValue(value: string) {
  return value.replace(/'/g, "\\'");
}

function buildQuickBooksCustomerBody(
  payload: QuickBooksCustomerSyncPayload,
  existing?: QuickBooksCustomer | null,
) {
  return {
    ...(existing
      ? {
          Id: existing.Id,
          SyncToken: existing.SyncToken ?? "0",
          sparse: true,
        }
      : {}),
    DisplayName: payload.organization_name,
    CompanyName: payload.legal_name ?? payload.organization_name,
    ...(payload.primary_email
      ? { PrimaryEmailAddr: { Address: payload.primary_email } }
      : {}),
    Notes: [
      `Olea organization id: ${payload.organization_id}`,
      `Tier: ${payload.tier}`,
      `Subscription: ${payload.subscription_status}`,
      payload.provider_subscription_id
        ? `Billing subscription: ${payload.provider_subscription_id}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function enqueueQuickBooksCustomerSync(
  supabase: SupabaseClient,
  payload: QuickBooksCustomerSyncPayload,
) {
  if (!payload.organization_name.trim()) {
    throw new Error("QuickBooks customer sync requires an organization name.");
  }

  const idempotencyKey = [
    "quickbooks",
    "customer",
    payload.organization_id,
    payload.reason,
    createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  ].join(":");

  const { error } = await supabase.from("integration_events").upsert(
    {
      event_type: "quickbooks.customer.upsert",
      aggregate_type: "organization",
      aggregate_id: payload.organization_id,
      provider: "quickbooks",
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

async function requestQuickBooks<T>(
  path: string,
  {
    method = "GET",
    body,
  }: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  } = {},
) {
  const config = getQuickBooksConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/v3/company/${config.realmId}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = (await response.json().catch(() => null)) as
    | (QuickBooksCustomerResponse & T)
    | null;

  if (!response.ok) {
    const fault = data?.Fault?.Error?.[0];
    const message =
      fault?.Detail ??
      fault?.Message ??
      `QuickBooks API request failed with ${response.status}.`;
    throw new Error(message);
  }

  return data as T;
}

async function getStoredQuickBooksCustomer(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organization_integrations")
    .select("external_id")
    .eq("organization_id", organizationId)
    .eq("provider", "quickbooks")
    .maybeSingle();

  if (error) throw error;
  if (!data?.external_id) return null;

  const response = await requestQuickBooks<QuickBooksCustomerResponse>(
    `/customer/${encodeURIComponent(data.external_id)}`,
  );
  return response.Customer ?? null;
}

async function findQuickBooksCustomerByName(organizationName: string) {
  const query = encodeURIComponent(
    `select * from Customer where DisplayName = '${escapeQuickBooksQueryValue(
      organizationName,
    )}' maxresults 1`,
  );
  const response = await requestQuickBooks<QuickBooksCustomerResponse>(
    `/query?query=${query}`,
  );
  return response.QueryResponse?.Customer?.[0] ?? null;
}

async function upsertQuickBooksCustomer(
  supabase: SupabaseClient,
  payload: QuickBooksCustomerSyncPayload,
) {
  const existing =
    (await getStoredQuickBooksCustomer(supabase, payload.organization_id)) ??
    (await findQuickBooksCustomerByName(payload.organization_name));
  const response = await requestQuickBooks<QuickBooksCustomerResponse>(
    "/customer",
    {
      method: "POST",
      body: buildQuickBooksCustomerBody(payload, existing),
    },
  );

  return response.Customer ?? null;
}

export async function processQuickBooksIntegrationEvent(
  supabase: SupabaseClient,
  event: IntegrationEvent<QuickBooksCustomerSyncPayload>,
) {
  if (event.event_type !== "quickbooks.customer.upsert") {
    throw new Error(`Unsupported QuickBooks event: ${event.event_type}`);
  }

  const customer = await upsertQuickBooksCustomer(supabase, event.payload);
  if (!customer?.Id) {
    throw new Error("QuickBooks did not return a customer id.");
  }

  const { error: integrationError } = await supabase
    .from("organization_integrations")
    .upsert(
      {
        organization_id: event.payload.organization_id,
        provider: "quickbooks",
        external_id: customer.Id,
        status: "active",
        settings: {
          sync_token: customer.SyncToken ?? null,
          display_name: customer.DisplayName ?? event.payload.organization_name,
          last_synced_tier: event.payload.tier,
          last_reason: event.payload.reason,
          last_synced_at: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,provider" },
    );

  if (integrationError) throw integrationError;
  await completeIntegrationEvent(supabase, event.id, customer.Id);
}
