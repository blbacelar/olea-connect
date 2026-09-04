import "server-only";

import type { SponsorReport, SponsorshipPackageSummary } from "@/lib/types";
import { canViewPrivateSponsorFinancials } from "@/lib/sponsors/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";
import {
  mapDirectoryProfile,
  mapGrantRoundOption,
  mapPackage,
  mapSponsorReports,
  type GrantProgramContributionRow,
  type SponsorContactRow,
  type SponsorContributionRow,
  type SponsorGrantRoundOption,
  type SponsorRow,
  type SponsorshipPackageRow,
  type SponsorshipRow,
} from "./sponsor-records";

export type { SponsorGrantRoundOption } from "./sponsor-records";

const sponsorManagerRoles = ["super_admin", "finance_admin"] as const;
const sponsorSelect =
  "id, name, slug, status, category, website_url, logo_path, short_description, directory_description, directory_email, directory_phone, directory_visible, values_reviewed_at";
const contactSelect = "id, sponsor_id, full_name, title, email, phone, is_primary";
const packageSelect =
  "id, name, annual_price_cents, olea_gives_contribution_cents, currency, category_exclusivity, benefits, is_active";
const sponsorshipSelect =
  "id, sponsor_id, package_id, status, starts_on, ends_on, contract_amount_cents, committed_contribution_cents, currency, category_exclusivity, recognition_preferences, private_terms, financial_notes";
const contributionSelect =
  "id, sponsorship_id, status, amount_cents, currency, pledged_on, received_on, allocated_on, quickbooks_transaction_id, notes";

export async function getSponsorsData() {
  const { member } = await requireMemberContext();
  const { directoryRows, roleRows } = await getDirectoryRowsAndRoles(member.id);
  const roles = (roleRows ?? []).map((row) => String(row.role));
  const canManageSponsors = canViewPrivateSponsorFinancials(roles);
  const reportingSponsorIds = await getReportingSponsorIds({
    canManageSponsors,
    email: member.email.toLowerCase(),
  });
  const reportsData = await getReportsData({
    canManageSponsors,
    reportingSponsorIds,
  });

  return {
    canManageSponsors,
    directorySponsors: ((directoryRows ?? []) as SponsorRow[]).map(
      mapDirectoryProfile,
    ),
    ...reportsData,
  };
}

async function getDirectoryRowsAndRoles(memberId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const [directoryResult, roleResult] = await Promise.all([
    supabase
      .from("sponsors")
      .select(sponsorSelect)
      .eq("status", "active")
      .eq("directory_visible", true)
      .not("values_reviewed_at", "is", null)
      .order("name", { ascending: true }),
    admin
      .from("platform_user_roles")
      .select("role")
      .eq("user_id", memberId)
      .in("role", [...sponsorManagerRoles]),
  ]);

  if (directoryResult.error) throw directoryResult.error;
  if (roleResult.error) throw roleResult.error;
  return { directoryRows: directoryResult.data, roleRows: roleResult.data };
}

async function getReportingSponsorIds({
  canManageSponsors,
  email,
}: {
  canManageSponsors: boolean;
  email: string;
}) {
  if (canManageSponsors) return [];

  const { data, error } = await createAdminClient()
    .from("sponsor_contacts")
    .select("sponsor_id")
    .eq("email", email);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => String(row.sponsor_id)))];
}

async function getReportsData({
  canManageSponsors,
  reportingSponsorIds,
}: {
  canManageSponsors: boolean;
  reportingSponsorIds: string[];
}) {
  if (!canManageSponsors && reportingSponsorIds.length === 0) {
    return emptyReportsData();
  }

  const bundle = await getReportsBundle({ canManageSponsors, reportingSponsorIds });
  const sponsorshipRows = await getSponsorshipRows(bundle.sponsorRows);
  const contributionRows = await getContributionRows(sponsorshipRows);
  const allocationRows = await getAllocationRows(contributionRows);

  return {
    reports: mapSponsorReports({
      allocations: allocationRows,
      canViewPrivateFinancials: canManageSponsors,
      contacts: bundle.contactRows,
      contributions: contributionRows,
      packages: bundle.packageRows,
      sponsors: bundle.sponsorRows,
      sponsorships: sponsorshipRows,
    }),
    packages: bundle.packageRows.map(mapPackage),
    grantPrograms: bundle.programRows.map((program) => ({
      id: program.id,
      name: program.name,
      slug: program.slug,
    })),
    grantRounds: bundle.roundRows.map(mapGrantRoundOption),
  };
}

function emptyReportsData(): {
  grantPrograms: Array<{ id: string; name: string; slug: string }>;
  grantRounds: SponsorGrantRoundOption[];
  packages: SponsorshipPackageSummary[];
  reports: SponsorReport[];
} {
  return { grantPrograms: [], grantRounds: [], packages: [], reports: [] };
}

async function getReportsBundle({
  canManageSponsors,
  reportingSponsorIds,
}: {
  canManageSponsors: boolean;
  reportingSponsorIds: string[];
}) {
  const admin = createAdminClient();
  const sponsorQuery = admin
    .from("sponsors")
    .select(sponsorSelect)
    .order("name", { ascending: true });
  const [sponsorsResult, contactsResult, packagesResult, programsResult, roundsResult] =
    await Promise.all([
      canManageSponsors ? sponsorQuery : sponsorQuery.in("id", reportingSponsorIds),
      admin.from("sponsor_contacts").select(contactSelect),
      admin
        .from("sponsorship_packages")
        .select(packageSelect)
        .order("sort_order", { ascending: true }),
      admin
        .from("grant_programs")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      admin
        .from("grant_rounds")
        .select("id, name, program_id, status")
        .order("opens_at", { ascending: false }),
    ]);

  if (sponsorsResult.error) throw sponsorsResult.error;
  if (contactsResult.error) throw contactsResult.error;
  if (packagesResult.error) throw packagesResult.error;
  if (programsResult.error) throw programsResult.error;
  if (roundsResult.error) throw roundsResult.error;

  return {
    contactRows: (contactsResult.data ?? []) as SponsorContactRow[],
    packageRows: (packagesResult.data ?? []) as SponsorshipPackageRow[],
    programRows: programsResult.data ?? [],
    roundRows: roundsResult.data ?? [],
    sponsorRows: (sponsorsResult.data ?? []) as SponsorRow[],
  };
}

async function getSponsorshipRows(sponsorRows: SponsorRow[]) {
  const sponsorIds = sponsorRows.map((row) => row.id);
  if (!sponsorIds.length) return [];

  const { data, error } = await createAdminClient()
    .from("sponsorships")
    .select(sponsorshipSelect)
    .in("sponsor_id", sponsorIds)
    .order("starts_on", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SponsorshipRow[];
}

async function getContributionRows(sponsorshipRows: SponsorshipRow[]) {
  const sponsorshipIds = sponsorshipRows.map((row) => row.id);
  if (!sponsorshipIds.length) return [];

  const { data, error } = await createAdminClient()
    .from("sponsor_contributions")
    .select(contributionSelect)
    .in("sponsorship_id", sponsorshipIds)
    .order("pledged_on", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SponsorContributionRow[];
}

async function getAllocationRows(contributionRows: SponsorContributionRow[]) {
  const contributionIds = contributionRows.map((row) => row.id);
  if (!contributionIds.length) return [];

  const { data, error } = await createAdminClient()
    .from("grant_program_contributions")
    .select(
      "contribution_id, amount_cents, grant_programs(name, slug), grant_rounds(name)",
    )
    .in("contribution_id", contributionIds);

  if (error) throw error;
  return (data ?? []) as GrantProgramContributionRow[];
}
