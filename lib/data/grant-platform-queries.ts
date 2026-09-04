import { logError } from "@/lib/observability/logger";
import { createClient } from "@/utils/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GrantPlatformRoundRow = {
  available_awards: number;
  award_amount_cents: number;
  budget_cents: number;
  closes_at: string | null;
  decision_at: string | null;
  grant_programs:
    | { description: string; name: string; type: string }
    | Array<{ description: string; name: string; type: string }>
    | null;
  id: string;
  name: string;
  opens_at: string | null;
  public_notes: string | null;
  status: string;
};

export type GrantPlatformApplicationRow = {
  collaboration_note: string | null;
  focus_area: string;
  funding_request: string;
  grant_awards: { status: string } | Array<{ status: string }> | null;
  grant_rounds: { closes_at: string | null; name: string } | Array<{
    closes_at: string | null;
    name: string;
  }> | null;
  id: string;
  requested_amount_cents: number;
  round_id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
};

export type GrantPlatformPartnerRow = {
  added_note: string | null;
  contact_name: string;
  email: string;
  focus_areas: string;
  id: string;
  last_collaboration: string | null;
  name: string;
  notes: string;
  partner_type: string;
  phone: string;
  status: string;
};

export type GrantPlatformMemberRow = {
  role: string;
  status: string;
  user_id: string;
};

export type GrantPlatformVaultRow = {
  content_type: string | null;
  created_at: string;
  file_name: string;
  id: string;
  size_bytes: number | null;
};

export type GrantPlatformSettingsRow = {
  current_annual_revenue_cents: number | null;
  funding_sources: string[] | null;
  organization_type: string;
};

export type GrantPlatformOrganizationRow = {
  name: string;
};

export async function loadGrantPlatformRows(
  supabase: SupabaseServerClient,
  organizationId: string,
) {
  const results = await fetchGrantPlatformRows(supabase, organizationId);
  logGrantPlatformErrors(results);

  return {
    applications: readQueryArray<GrantPlatformApplicationRow>(results.applications),
    members: readQueryArray<GrantPlatformMemberRow>(results.members),
    organizationRecord: readQueryRecord<GrantPlatformOrganizationRow>(
      results.organizationRecord,
    ),
    organizationSettings: readQueryRecord<GrantPlatformSettingsRow>(results.settings),
    partners: readQueryArray<GrantPlatformPartnerRow>(results.partners),
    rounds: readQueryArray<GrantPlatformRoundRow>(results.rounds),
    vaultItems: readQueryArray<GrantPlatformVaultRow>(results.vault),
  };
}

export async function loadGrantPlatformProfileMap(
  supabase: SupabaseServerClient,
  members: GrantPlatformMemberRow[],
) {
  const profileIds = members.map((memberRecord) => memberRecord.user_id);
  const profileMap = new Map<string, string>();
  if (!profileIds.length) return profileMap;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (error) {
    logError("grant-platform: failed to load member profiles", error);
    return profileMap;
  }

  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, profile.full_name?.trim() || profile.id);
  }

  return profileMap;
}

function fetchGrantPlatformRows(
  supabase: SupabaseServerClient,
  organizationId: string,
) {
  return Promise.all([
    supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    supabase
      .from("grant_organization_settings")
      .select("organization_type, current_annual_revenue_cents, funding_sources")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("grant_rounds")
      .select("id, name, status, opens_at, closes_at, decision_at, award_amount_cents, available_awards, budget_cents, public_notes, grant_programs(name, type, description)")
      .order("opens_at", { ascending: true }),
    supabase
      .from("grant_applications")
      .select("id, round_id, status, focus_area, funding_request, requested_amount_cents, submitted_at, collaboration_note, updated_at, grant_rounds(name, closes_at), grant_awards(status)")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("grant_partners")
      .select("id, name, partner_type, contact_name, email, phone, focus_areas, status, notes, last_collaboration, added_note, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("user_id, role, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("grant_application_attachments")
      .select("id, file_name, content_type, size_bytes, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]).then(
    ([
      organizationRecord,
      settings,
      rounds,
      applications,
      partners,
      members,
      vault,
    ]) => ({
      applications,
      members,
      organizationRecord,
      partners,
      rounds,
      settings,
      vault,
    }),
  );
}

type GrantPlatformQueryResults = Awaited<
  ReturnType<typeof fetchGrantPlatformRows>
>;

function logGrantPlatformErrors(results: GrantPlatformQueryResults) {
  logQueryError(results.organizationRecord.error, "organization record");
  logQueryError(results.settings.error, "organization settings");
  logQueryError(results.rounds.error, "grant rounds");
  logQueryError(results.applications.error, "grant applications");
  logQueryError(results.partners.error, "grant partners");
  logQueryError(results.members.error, "organization members");
  logQueryError(results.vault.error, "vault items");
}

function logQueryError(error: unknown, label: string) {
  if (error) logError(`grant-platform: failed to load ${label}`, error);
}

function readQueryArray<Row>(result: { data: unknown; error: unknown }) {
  return result.error ? [] : ((result.data ?? []) as Row[]);
}

function readQueryRecord<Row>(result: { data: unknown; error: unknown }) {
  return result.error ? null : (result.data as Row | null);
}
