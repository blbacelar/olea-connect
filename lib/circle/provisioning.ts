import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getCircleConfig,
  getCircleMemberTagIds,
  getCircleSpaceGroupIds,
} from "@/lib/circle/config";
import type { Member, Organization } from "@/lib/types";

type CircleAction = "provision" | "deprovision";

export interface CircleProvisioningPayload {
  action: CircleAction;
  email: string;
  name: string;
  external_id: string;
  organization_id: string;
  organization_name: string;
  organization_role: string;
  tier: Organization["tier"];
  member_tag: Organization["tier"];
  member_tag_ids: number[];
  space_group_ids: number[];
  reason: string;
}

interface CircleMemberResponse {
  id: number;
  email?: string;
  name?: string;
  active?: boolean;
}

interface CircleEvent {
  id: string;
  event_type: string;
  payload: CircleProvisioningPayload;
  attempts: number;
}

export function isCircleAction(value: unknown): value is CircleAction {
  return value === "provision" || value === "deprovision";
}

export function buildCircleProvisioningPayload({
  action,
  member,
  organization,
  reason,
}: {
  action: CircleAction;
  member: Member;
  organization: Organization;
  reason: string;
}): CircleProvisioningPayload {
  return {
    action,
    email: member.email,
    name: member.name,
    external_id: member.id,
    organization_id: organization.id,
    organization_name: organization.name,
    organization_role: member.membershipRole,
    tier: organization.tier,
    member_tag: organization.tier,
    member_tag_ids: getCircleMemberTagIds(organization.tier),
    space_group_ids: getCircleSpaceGroupIds(organization.tier),
    reason,
  };
}

export async function enqueueCircleMemberSync(
  supabase: SupabaseClient,
  payload: CircleProvisioningPayload,
) {
  if (!payload.email.trim()) {
    throw new Error("Circle member sync requires an email address.");
  }

  const idempotencyKey = [
    "circle",
    payload.action,
    payload.organization_id,
    payload.external_id,
    payload.reason,
    createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  ].join(":");

  const { error } = await supabase.from("integration_events").upsert({
    event_type: `circle.member.${payload.action}`,
    aggregate_type: "community_membership",
    aggregate_id: `${payload.organization_id}:${payload.external_id}`,
    provider: "circle",
    payload,
    status: "pending",
    attempts: 0,
    available_at: new Date().toISOString(),
    locked_at: null,
    completed_at: null,
    last_error: null,
    idempotency_key: idempotencyKey,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });

  if (error) throw error;
}

async function requestCircle<T>(
  path: string,
  {
    method = "GET",
    body,
  }: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
  } = {},
) {
  const config = getCircleConfig({ requireApiToken: true });
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Token ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 404) return null;
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Circle API request failed with ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

async function searchCircleMember(email: string) {
  const data = await requestCircle<CircleMemberResponse>(
    `/api/admin/v2/community_members/search?email=${encodeURIComponent(email)}`,
  );

  return data;
}

async function provisionCircleMember(payload: CircleProvisioningPayload) {
  const existingMember = await searchCircleMember(payload.email);
  const body = {
    email: payload.email,
    name: payload.name,
    skip_invitation: true,
    member_tag_ids: payload.member_tag_ids,
    space_group_ids: payload.space_group_ids,
    community_member_profile_fields: {
      olea_user_id: payload.external_id,
      olea_organization_id: payload.organization_id,
      olea_organization_name: payload.organization_name,
      olea_tier: payload.tier,
      olea_role: payload.organization_role,
    },
  };

  if (!existingMember) {
    const created = await requestCircle<{ community_member: CircleMemberResponse }>(
      "/api/admin/v2/community_members",
      { method: "POST", body },
    );
    return created?.community_member ?? null;
  }

  await requestCircle(`/api/admin/v2/community_members/${existingMember.id}`, {
    method: "PUT",
    body,
  });
  return existingMember;
}

async function deprovisionCircleMember(payload: CircleProvisioningPayload) {
  const existingMember = await searchCircleMember(payload.email);
  if (!existingMember) return null;

  await requestCircle(`/api/admin/v2/community_members/${existingMember.id}`, {
    method: "DELETE",
  });

  return existingMember;
}

export async function processCircleIntegrationEvent(
  supabase: SupabaseClient,
  event: CircleEvent,
) {
  const payload = event.payload;
  if (!isCircleAction(payload.action)) {
    throw new Error(`Unsupported Circle action: ${String(payload.action)}`);
  }

  const communityMember =
    payload.action === "provision"
      ? await provisionCircleMember(payload)
      : await deprovisionCircleMember(payload);

  const membership = {
    organization_id: payload.organization_id,
    user_id: payload.external_id,
    provider: "circle",
    provider_user_id: communityMember?.id ? String(communityMember.id) : null,
    status: payload.action === "provision" ? "active" : "deprovisioned",
    provisioned_at:
      payload.action === "provision" ? new Date().toISOString() : null,
    last_synced_at: new Date().toISOString(),
  };

  const { error: membershipError } = await supabase
    .from("community_memberships")
    .upsert(membership, { onConflict: "organization_id,user_id,provider" });
  if (membershipError) throw membershipError;

  const { error: eventError } = await supabase
    .from("integration_events")
    .update({
      status: "completed",
      provider_message_id: null,
      processing_started_at: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", event.id);
  if (eventError) throw eventError;
}

export async function failCircleIntegrationEvent(
  supabase: SupabaseClient,
  event: CircleEvent,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Unknown Circle integration error";
  const { error: updateError } = await supabase
    .from("integration_events")
    .update({
      status: event.attempts >= 5 ? "dead_letter" : "failed",
      processing_started_at: null,
      last_error: message,
      available_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .eq("id", event.id);

  if (updateError) throw updateError;
}
