import "server-only";

import { z } from "zod";

import type { SponsorReport } from "@/lib/types";
import { aggregatePartnerRegions, summarizeFundedBoards } from "@/lib/sponsors/impact";
import { createAdminClient } from "@/utils/supabase/admin";

export type SponsoredPlacement = {
  id: string;
  sponsorshipId: string;
  organizationName: string | null;
  region: string | null;
  planId: "seedling" | "roots";
  allocationCents: number;
  status: "active" | "completed" | "canceled";
  startsAt: string;
  endsAt: string;
};

export type SponsorBoardTarget = {
  packageId: string;
  planId: "seedling" | "roots";
  boardCount: number;
  allocationCents: number;
};

export type SponsorshipImpact = {
  sponsorshipId: string;
  templateExports: number;
  trainingCertificates: number;
  attendedEvents: number;
  completedEvaluations: number;
  completedMilestones: number;
  regions: Array<{ region: string; count: number }>;
};

export type FundedBoardSummary = ReturnType<typeof summarizeFundedBoards>;

export type SponsorableOrganization = {
  id: string;
  name: string;
  budgetLabel: string;
  budgetLabelFr: string;
  annualBudgetRange: string | null;
  region: string | null;
};

const impactRowSchema = z.object({
  template_exports: z.coerce.number().int().nonnegative(),
  training_certificates: z.coerce.number().int().nonnegative(),
  attended_events: z.coerce.number().int().nonnegative(),
  completed_evaluations: z.coerce.number().int().nonnegative(),
  completed_milestones: z.coerce.number().int().nonnegative(),
});

export async function getSponsorFundingData(
  reports: SponsorReport[],
  canManageSponsors: boolean,
) {
  const admin = createAdminClient();
  const sponsorshipIds = reports.flatMap((sponsor) =>
    sponsor.sponsorships.map((sponsorship) => sponsorship.id),
  );
  const [targetsResult, placementsResult, organizationsResult, subscriptionsResult] =
    await Promise.all([
      admin.from("sponsorship_board_targets")
        .select("package_id, plan_id, board_count, allocation_cents"),
      sponsorshipIds.length
        ? admin.from("sponsored_memberships")
            .select("id, sponsorship_id, plan_id, allocation_cents, status, starts_at, ends_at, organizations(name, province_or_region)")
            .in("sponsorship_id", sponsorshipIds)
            .order("starts_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      canManageSponsors
        ? admin.from("organizations")
            .select("id, name, annual_budget_range, annual_revenue_cents, province_or_region")
            .eq("country_code", "CA")
            .neq("kind", "other")
            .order("name")
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      canManageSponsors
        ? admin.from("subscriptions")
            .select("organization_id")
            .in("status", ["active", "trialing"])
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const result of [targetsResult, placementsResult, organizationsResult, subscriptionsResult]) {
    if (result.error) throw result.error;
  }

  const activeOrganizationIds = new Set(
    (subscriptionsResult.data ?? []).map((item) => item.organization_id),
  );
  const progress = sponsorshipIds.map((sponsorshipId) => summarizeFundedBoards(
    (placementsResult.data ?? []).map((row) => ({
      sponsorshipId: row.sponsorship_id,
      planId: row.plan_id,
      status: row.status,
    })), sponsorshipId,
  ));
  const impactResults = await Promise.all((canManageSponsors ? sponsorshipIds : []).map(async (sponsorshipId) => {
    const { data, error } = await admin.rpc("sponsorship_impact_summary", {
      p_sponsorship_id: sponsorshipId,
    }).single();
    if (error) throw error;
    const impact = impactRowSchema.parse(data);
    return {
      sponsorshipId,
      templateExports: impact.template_exports,
      trainingCertificates: impact.training_certificates,
      attendedEvents: impact.attended_events,
      completedEvaluations: impact.completed_evaluations,
      completedMilestones: impact.completed_milestones,
      regions: aggregatePartnerRegions((placementsResult.data ?? []).map((row) => {
        const organization = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations;
        return {
          sponsorshipId: row.sponsorship_id,
          region: organization?.province_or_region ?? null,
          status: row.status,
        };
      }), sponsorshipId),
    } satisfies SponsorshipImpact;
  }));

  return {
    impacts: impactResults,
    progress,
    targets: (targetsResult.data ?? []).map((row) => ({
      packageId: row.package_id,
      planId: row.plan_id as SponsorBoardTarget["planId"],
      boardCount: row.board_count,
      allocationCents: row.allocation_cents,
    })) satisfies SponsorBoardTarget[],
    placements: (canManageSponsors ? placementsResult.data ?? [] : []).map((row) => {
      const organization = Array.isArray(row.organizations)
        ? row.organizations[0]
        : row.organizations;
      return {
        id: row.id,
        sponsorshipId: row.sponsorship_id,
        organizationName: canManageSponsors ? organization?.name ?? null : null,
        region: canManageSponsors ? organization?.province_or_region ?? null : null,
        planId: row.plan_id as SponsoredPlacement["planId"],
        allocationCents: row.allocation_cents,
        status: row.status as SponsoredPlacement["status"],
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      };
    }) satisfies SponsoredPlacement[],
    organizations: (organizationsResult.data ?? [])
      .filter((row) => !activeOrganizationIds.has(row.id))
      .map((row) => ({
        id: row.id,
        name: row.name,
        annualBudgetRange: row.annual_budget_range,
        budgetLabel: row.annual_budget_range
          ? `${row.annual_budget_range.replaceAll("k", "K").replaceAll("m", "M")} budget range`
          : row.annual_revenue_cents !== null
            ? `${new Intl.NumberFormat("en-CA", {
                style: "currency", currency: "CAD", maximumFractionDigits: 0,
              }).format(row.annual_revenue_cents / 100)} revenue`
            : "budget not reported",
        budgetLabelFr: row.annual_budget_range
          ? `budget déclaré : ${row.annual_budget_range.replaceAll("k", "K").replaceAll("m", "M")}`
          : row.annual_revenue_cents !== null
            ? `revenu déclaré : ${new Intl.NumberFormat("fr-CA", {
                style: "currency", currency: "CAD", maximumFractionDigits: 0,
              }).format(row.annual_revenue_cents / 100)}`
            : "budget non déclaré",
        region: row.province_or_region,
      })) satisfies SponsorableOrganization[],
  };
}
