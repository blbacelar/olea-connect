import "server-only";

import type {
  SponsorContributionSummary,
  SponsorDirectoryProfile,
  SponsorshipPackageSummary,
  SponsorReport,
  SponsorshipReport,
} from "@/lib/types";
import {
  canViewPrivateSponsorFinancials,
  normalizeOptionalHttpUrl,
  summarizeContributionReconciliation,
} from "@/lib/sponsors/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

const sponsorManagerRoles = ["super_admin", "finance_admin"] as const;

type SponsorRow = {
  id: string;
  name: string;
  slug: string;
  status: SponsorReport["status"];
  category: string | null;
  website_url: string | null;
  logo_path: string | null;
  short_description: string | null;
  directory_description: string | null;
  directory_email: string | null;
  directory_phone: string | null;
  directory_visible: boolean;
  values_reviewed_at: string | null;
};

type SponsorContactRow = {
  id: string;
  sponsor_id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
};

type SponsorshipPackageRow = {
  id: string;
  name: string;
  annual_price_cents: number;
  olea_gives_contribution_cents: number;
  currency: string;
  category_exclusivity: boolean;
  benefits: unknown;
  is_active: boolean;
};

type SponsorshipRow = {
  id: string;
  sponsor_id: string;
  package_id: string;
  status: SponsorshipReport["status"];
  starts_on: string;
  ends_on: string;
  contract_amount_cents: number;
  committed_contribution_cents: number;
  currency: string;
  category_exclusivity: string | null;
  recognition_preferences: Record<string, unknown> | null;
  private_terms: string | null;
  financial_notes: string | null;
};

type SponsorContributionRow = {
  id: string;
  sponsorship_id: string;
  status: SponsorContributionSummary["status"];
  amount_cents: number;
  currency: string;
  pledged_on: string;
  received_on: string | null;
  allocated_on: string | null;
  quickbooks_transaction_id: string | null;
  notes: string | null;
};

type GrantProgramContributionRow = {
  contribution_id: string;
  amount_cents: number;
  grant_programs:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
  grant_rounds:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

export type SponsorGrantRoundOption = {
  id: string;
  name: string;
  programId: string;
  status: string;
};

function singleRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function packageBenefits(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}

function mapDirectoryProfile(row: SponsorRow): SponsorDirectoryProfile {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    websiteUrl: normalizeOptionalHttpUrl(row.website_url),
    logoPath: row.logo_path,
    shortDescription: row.short_description,
    directoryDescription: row.directory_description,
    directoryEmail: row.directory_email,
    directoryPhone: row.directory_phone,
  };
}

function mapPackage(row: SponsorshipPackageRow): SponsorshipPackageSummary {
  return {
    id: row.id,
    name: row.name,
    annualPriceCents: row.annual_price_cents,
    oleaGivesContributionCents: row.olea_gives_contribution_cents,
    currency: row.currency,
    categoryExclusivity: row.category_exclusivity,
    benefits: packageBenefits(row.benefits),
    isActive: row.is_active,
  };
}

function mapSponsorReports({
  allocations,
  canViewPrivateFinancials,
  contacts,
  contributions,
  packages,
  sponsors,
  sponsorships,
}: {
  allocations: GrantProgramContributionRow[];
  canViewPrivateFinancials: boolean;
  contacts: SponsorContactRow[];
  contributions: SponsorContributionRow[];
  packages: SponsorshipPackageRow[];
  sponsors: SponsorRow[];
  sponsorships: SponsorshipRow[];
}): SponsorReport[] {
  const packageById = new Map(packages.map((item) => [item.id, item]));
  const contactsBySponsor = groupBy(contacts, (contact) => contact.sponsor_id);
  const sponsorshipsBySponsor = groupBy(
    sponsorships,
    (sponsorship) => sponsorship.sponsor_id,
  );
  const contributionsBySponsorship = groupBy(
    contributions,
    (contribution) => contribution.sponsorship_id,
  );
  const allocationsByContribution = groupBy(
    allocations,
    (allocation) => allocation.contribution_id,
  );

  return sponsors.map((sponsor) => ({
    id: sponsor.id,
    name: sponsor.name,
    slug: sponsor.slug,
    status: sponsor.status,
    category: sponsor.category,
    websiteUrl: normalizeOptionalHttpUrl(sponsor.website_url),
    shortDescription: sponsor.short_description,
    directoryVisible: sponsor.directory_visible,
    contacts: (contactsBySponsor.get(sponsor.id) ?? []).map((contact) => ({
      id: contact.id,
      fullName: contact.full_name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      isPrimary: contact.is_primary,
    })),
    sponsorships: (sponsorshipsBySponsor.get(sponsor.id) ?? []).map(
      (sponsorship) => {
        const packageRow = packageById.get(sponsorship.package_id);
        const sponsorshipContributions =
          contributionsBySponsorship.get(sponsorship.id) ?? [];
        const mappedContributions = sponsorshipContributions.map(
          (contribution) => {
            const contributionAllocations =
              allocationsByContribution.get(contribution.id) ?? [];

            return {
              id: contribution.id,
              status: contribution.status,
              amountCents: contribution.amount_cents,
              currency: contribution.currency,
              pledgedOn: contribution.pledged_on,
              receivedOn: contribution.received_on,
              allocatedOn: contribution.allocated_on,
              quickbooksTransactionId: contribution.quickbooks_transaction_id,
              notes: contribution.notes,
              allocations: contributionAllocations.map((allocation) => {
                const program = singleRelation(allocation.grant_programs);
                const round = singleRelation(allocation.grant_rounds);
                return {
                  amountCents: allocation.amount_cents,
                  grantProgramName: program?.name ?? "Grant program",
                  grantProgramSlug: program?.slug ?? "grant-program",
                  grantRoundName: round?.name ?? null,
                };
              }),
              allocatedAmountCents: contributionAllocations.reduce(
                (total, allocation) => total + allocation.amount_cents,
                0,
              ),
            };
          },
        );
        const reconciliation = summarizeContributionReconciliation(
          mappedContributions.map((contribution) => ({
            allocatedAmountCents: contribution.allocatedAmountCents,
            amountCents: contribution.amountCents,
          })),
        );

        return {
          id: sponsorship.id,
          sponsorId: sponsor.id,
          sponsorName: sponsor.name,
          packageId: sponsorship.package_id,
          packageName: packageRow?.name ?? sponsorship.package_id,
          status: sponsorship.status,
          startsOn: sponsorship.starts_on,
          endsOn: sponsorship.ends_on,
          contractAmountCents: sponsorship.contract_amount_cents,
          committedContributionCents:
            sponsorship.committed_contribution_cents,
          currency: sponsorship.currency,
          categoryExclusivity: sponsorship.category_exclusivity,
          recognitionPreferences: sponsorship.recognition_preferences ?? {},
          privateTerms: canViewPrivateFinancials
            ? sponsorship.private_terms
            : null,
          financialNotes: canViewPrivateFinancials
            ? sponsorship.financial_notes
            : null,
          ...reconciliation,
          contributions: mappedContributions,
        };
      },
    ),
  }));
}

export async function getSponsorsData() {
  const { member } = await requireMemberContext();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: directoryRows, error: directoryError }, { data: roleRows, error: roleError }] =
    await Promise.all([
      supabase
        .from("sponsors")
        .select(
          "id, name, slug, status, category, website_url, logo_path, short_description, directory_description, directory_email, directory_phone, directory_visible, values_reviewed_at",
        )
        .eq("status", "active")
        .eq("directory_visible", true)
        .not("values_reviewed_at", "is", null)
        .order("name", { ascending: true }),
      admin
        .from("platform_user_roles")
        .select("role")
        .eq("user_id", member.id)
        .in("role", [...sponsorManagerRoles]),
    ]);

  if (directoryError) throw directoryError;
  if (roleError) throw roleError;

  const roles = (roleRows ?? []).map((row) => String(row.role));
  const canManageSponsors = canViewPrivateSponsorFinancials(roles);
  const memberEmail = member.email.toLowerCase();
  let reportingSponsorIds: string[] = [];

  if (!canManageSponsors) {
    const { data: contactRows, error: contactError } = await admin
      .from("sponsor_contacts")
      .select("sponsor_id")
      .eq("email", memberEmail);

    if (contactError) throw contactError;
    reportingSponsorIds = [
      ...new Set((contactRows ?? []).map((row) => String(row.sponsor_id))),
    ];
  }

  const shouldLoadReports = canManageSponsors || reportingSponsorIds.length > 0;
  let reports: SponsorReport[] = [];
  let packages: SponsorshipPackageSummary[] = [];
  let grantPrograms: Array<{ id: string; name: string; slug: string }> = [];
  let grantRounds: SponsorGrantRoundOption[] = [];

  if (shouldLoadReports) {
    const sponsorQuery = admin
      .from("sponsors")
      .select(
        "id, name, slug, status, category, website_url, logo_path, short_description, directory_description, directory_email, directory_phone, directory_visible, values_reviewed_at",
      )
      .order("name", { ascending: true });
    const [
      { data: sponsorRows, error: sponsorError },
      { data: contactRows, error: contactsError },
      { data: packageRows, error: packagesError },
      { data: programRows, error: programsError },
      { data: roundRows, error: roundsError },
    ] = await Promise.all([
      canManageSponsors
        ? sponsorQuery
        : sponsorQuery.in("id", reportingSponsorIds),
      admin
        .from("sponsor_contacts")
        .select("id, sponsor_id, full_name, title, email, phone, is_primary"),
      admin
        .from("sponsorship_packages")
        .select(
          "id, name, annual_price_cents, olea_gives_contribution_cents, currency, category_exclusivity, benefits, is_active",
        )
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

    if (sponsorError) throw sponsorError;
    if (contactsError) throw contactsError;
    if (packagesError) throw packagesError;
    if (programsError) throw programsError;
    if (roundsError) throw roundsError;

    const sponsorIds = (sponsorRows ?? []).map((row) => row.id);
    const { data: sponsorshipRows, error: sponsorshipsError } = sponsorIds.length
      ? await admin
          .from("sponsorships")
          .select(
            "id, sponsor_id, package_id, status, starts_on, ends_on, contract_amount_cents, committed_contribution_cents, currency, category_exclusivity, recognition_preferences, private_terms, financial_notes",
          )
          .in("sponsor_id", sponsorIds)
          .order("starts_on", { ascending: false })
      : { data: [], error: null };

    if (sponsorshipsError) throw sponsorshipsError;

    const sponsorshipIds = (sponsorshipRows ?? []).map((row) => row.id);
    const { data: contributionRows, error: contributionsError } =
      sponsorshipIds.length
        ? await admin
            .from("sponsor_contributions")
            .select(
              "id, sponsorship_id, status, amount_cents, currency, pledged_on, received_on, allocated_on, quickbooks_transaction_id, notes",
            )
            .in("sponsorship_id", sponsorshipIds)
            .order("pledged_on", { ascending: false })
        : { data: [], error: null };

    if (contributionsError) throw contributionsError;

    const contributionIds = (contributionRows ?? []).map((row) => row.id);
    const { data: allocationRows, error: allocationsError } =
      contributionIds.length
        ? await admin
            .from("grant_program_contributions")
            .select(
              "contribution_id, amount_cents, grant_programs(name, slug), grant_rounds(name)",
            )
            .in("contribution_id", contributionIds)
        : { data: [], error: null };

    if (allocationsError) throw allocationsError;

    reports = mapSponsorReports({
      allocations: (allocationRows ?? []) as GrantProgramContributionRow[],
      canViewPrivateFinancials: canManageSponsors,
      contacts: (contactRows ?? []) as SponsorContactRow[],
      contributions: (contributionRows ?? []) as SponsorContributionRow[],
      packages: (packageRows ?? []) as SponsorshipPackageRow[],
      sponsors: (sponsorRows ?? []) as SponsorRow[],
      sponsorships: (sponsorshipRows ?? []) as SponsorshipRow[],
    });
    packages = ((packageRows ?? []) as SponsorshipPackageRow[]).map(mapPackage);
    grantPrograms = (programRows ?? []).map((program) => ({
      id: program.id,
      name: program.name,
      slug: program.slug,
    }));
    grantRounds = (roundRows ?? []).map((round) => ({
      id: round.id,
      name: round.name,
      programId: round.program_id,
      status: String(round.status),
    }));
  }

  return {
    canManageSponsors,
    directorySponsors: ((directoryRows ?? []) as SponsorRow[]).map(
      mapDirectoryProfile,
    ),
    grantPrograms,
    grantRounds,
    packages,
    reports,
  };
}
