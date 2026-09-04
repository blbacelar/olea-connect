import type {
  SponsorContributionSummary,
  SponsorDirectoryProfile,
  SponsorshipPackageSummary,
  SponsorReport,
  SponsorshipReport,
} from "@/lib/types";
import {
  normalizeOptionalHttpUrl,
  summarizeContributionReconciliation,
} from "@/lib/sponsors/domain";

export type SponsorRow = {
  category: string | null;
  directory_description: string | null;
  directory_email: string | null;
  directory_phone: string | null;
  directory_visible: boolean;
  id: string;
  logo_path: string | null;
  name: string;
  short_description: string | null;
  slug: string;
  status: SponsorReport["status"];
  values_reviewed_at: string | null;
  website_url: string | null;
};

export type SponsorContactRow = {
  email: string | null;
  full_name: string;
  id: string;
  is_primary: boolean;
  phone: string | null;
  sponsor_id: string;
  title: string | null;
};

export type SponsorshipPackageRow = {
  annual_price_cents: number;
  benefits: unknown;
  category_exclusivity: boolean;
  currency: string;
  id: string;
  is_active: boolean;
  name: string;
  olea_gives_contribution_cents: number;
};

export type SponsorshipRow = {
  category_exclusivity: string | null;
  committed_contribution_cents: number;
  contract_amount_cents: number;
  currency: string;
  ends_on: string;
  financial_notes: string | null;
  id: string;
  package_id: string;
  private_terms: string | null;
  recognition_preferences: Record<string, unknown> | null;
  sponsor_id: string;
  starts_on: string;
  status: SponsorshipReport["status"];
};

export type SponsorContributionRow = {
  allocated_on: string | null;
  amount_cents: number;
  currency: string;
  id: string;
  notes: string | null;
  pledged_on: string;
  quickbooks_transaction_id: string | null;
  received_on: string | null;
  sponsorship_id: string;
  status: SponsorContributionSummary["status"];
};

type GrantProgramRelation = {
  name: string;
  slug: string;
};

type GrantRoundRelation = {
  name: string;
};

export type GrantProgramContributionRow = {
  amount_cents: number;
  contribution_id: string;
  grant_programs: GrantProgramRelation | GrantProgramRelation[] | null;
  grant_rounds: GrantRoundRelation | GrantRoundRelation[] | null;
};

export type SponsorGrantRoundOption = {
  id: string;
  name: string;
  programId: string;
  status: string;
};

export function mapDirectoryProfile(row: SponsorRow): SponsorDirectoryProfile {
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

export function mapPackage(
  row: SponsorshipPackageRow,
): SponsorshipPackageSummary {
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

export function mapSponsorReports({
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

  return sponsors.map((sponsor) =>
    mapSponsorReport({
      allocationsByContribution,
      canViewPrivateFinancials,
      contactsBySponsor,
      contributionsBySponsorship,
      packageById,
      sponsor,
      sponsorshipsBySponsor,
    }),
  );
}

export function mapGrantRoundOption(row: {
  id: string;
  name: string;
  program_id: string;
  status: unknown;
}): SponsorGrantRoundOption {
  return {
    id: row.id,
    name: row.name,
    programId: row.program_id,
    status: String(row.status),
  };
}

function mapSponsorReport({
  allocationsByContribution,
  canViewPrivateFinancials,
  contactsBySponsor,
  contributionsBySponsorship,
  packageById,
  sponsor,
  sponsorshipsBySponsor,
}: {
  allocationsByContribution: Map<string, GrantProgramContributionRow[]>;
  canViewPrivateFinancials: boolean;
  contactsBySponsor: Map<string, SponsorContactRow[]>;
  contributionsBySponsorship: Map<string, SponsorContributionRow[]>;
  packageById: Map<string, SponsorshipPackageRow>;
  sponsor: SponsorRow;
  sponsorshipsBySponsor: Map<string, SponsorshipRow[]>;
}): SponsorReport {
  return {
    id: sponsor.id,
    name: sponsor.name,
    slug: sponsor.slug,
    status: sponsor.status,
    category: sponsor.category,
    websiteUrl: normalizeOptionalHttpUrl(sponsor.website_url),
    shortDescription: sponsor.short_description,
    directoryVisible: sponsor.directory_visible,
    contacts: (contactsBySponsor.get(sponsor.id) ?? []).map(mapContact),
    sponsorships: (sponsorshipsBySponsor.get(sponsor.id) ?? []).map(
      (sponsorship) =>
        mapSponsorshipReport({
          allocationsByContribution,
          canViewPrivateFinancials,
          contributionsBySponsorship,
          packageRow: packageById.get(sponsorship.package_id),
          sponsor,
          sponsorship,
        }),
    ),
  };
}

function mapContact(contact: SponsorContactRow) {
  return {
    id: contact.id,
    fullName: contact.full_name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    isPrimary: contact.is_primary,
  };
}

function mapSponsorshipReport({
  allocationsByContribution,
  canViewPrivateFinancials,
  contributionsBySponsorship,
  packageRow,
  sponsor,
  sponsorship,
}: {
  allocationsByContribution: Map<string, GrantProgramContributionRow[]>;
  canViewPrivateFinancials: boolean;
  contributionsBySponsorship: Map<string, SponsorContributionRow[]>;
  packageRow: SponsorshipPackageRow | undefined;
  sponsor: SponsorRow;
  sponsorship: SponsorshipRow;
}): SponsorshipReport {
  const mappedContributions = (
    contributionsBySponsorship.get(sponsorship.id) ?? []
  ).map((contribution) =>
    mapSponsorContribution(contribution, allocationsByContribution),
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
    committedContributionCents: sponsorship.committed_contribution_cents,
    currency: sponsorship.currency,
    categoryExclusivity: sponsorship.category_exclusivity,
    recognitionPreferences: sponsorship.recognition_preferences ?? {},
    privateTerms: canViewPrivateFinancials ? sponsorship.private_terms : null,
    financialNotes: canViewPrivateFinancials
      ? sponsorship.financial_notes
      : null,
    ...reconciliation,
    contributions: mappedContributions,
  };
}

function mapSponsorContribution(
  contribution: SponsorContributionRow,
  allocationsByContribution: Map<string, GrantProgramContributionRow[]>,
) {
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
    allocations: contributionAllocations.map(mapContributionAllocation),
    allocatedAmountCents: contributionAllocations.reduce(
      (total, allocation) => total + allocation.amount_cents,
      0,
    ),
  };
}

function mapContributionAllocation(allocation: GrantProgramContributionRow) {
  const program = singleRelation(allocation.grant_programs);
  const round = singleRelation(allocation.grant_rounds);

  return {
    amountCents: allocation.amount_cents,
    grantProgramName: program?.name ?? "Grant program",
    grantProgramSlug: program?.slug ?? "grant-program",
    grantRoundName: round?.name ?? null,
  };
}

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
