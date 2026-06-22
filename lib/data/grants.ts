import "server-only";

import type {
  GrantApplicationSummary,
  GrantRound,
} from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

type PlatformRole = "super_admin" | "grants_admin" | "finance_admin";

const grantsAdminRoles = new Set<PlatformRole>(["super_admin", "grants_admin"]);

function singleRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mapApplication(
  application: any,
  applicantReviews?: GrantApplicationSummary["reviews"],
): GrantApplicationSummary {
  const round = singleRelation(application.grant_rounds);
  const organization = singleRelation(application.organizations);
  const award = singleRelation(application.grant_awards);

  return {
    id: application.id,
    roundId: application.round_id,
    roundName: round?.name ?? "Grant application",
    organizationName: organization?.name ?? "Member organization",
    status: application.status,
    focusArea: application.focus_area,
    fundingRequest: application.funding_request,
    expectedOutcome: application.expected_outcome,
    requestedAmountCents: application.requested_amount_cents,
    annualRevenueCents: application.annual_revenue_cents,
    craGoodStanding: application.cra_good_standing,
    registeredInCanada: application.registered_in_canada,
    submittedAt: application.submitted_at,
    withdrawnAt: application.withdrawn_at,
    updatedAt: application.updated_at,
    award: award
      ? {
          id: award.id,
          status: award.status,
          amountCents: award.amount_cents,
          paidOn: award.paid_on,
          paymentReference: award.payment_reference,
          impactStory: award.impact_story,
          impactStoryConsent: award.impact_story_consent,
          outcomeReceivedAt: award.outcome_received_at,
        }
      : null,
    reviews:
      applicantReviews ??
      application.grant_application_reviews?.map((review: any) => ({
        id: review.id,
        score: review.score,
        recommendation: review.recommendation,
        internalNotes: review.internal_notes,
        reviewedAt: review.reviewed_at,
      })),
  };
}

export async function getGrantsData(): Promise<{
  rounds: GrantRound[];
  applications: GrantApplicationSummary[];
  adminApplications: GrantApplicationSummary[];
  canAdministerGrants: boolean;
  organizationDefaults: {
    annualRevenueCents: number | null;
    craGoodStanding: boolean | null;
    registeredInCanada: boolean;
  };
}> {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [
    { data: organizationRecord, error: organizationError },
    { data: subscription, error: subscriptionError },
    { data: roles, error: rolesError },
    { data: rounds, error: roundsError },
    { data: applications, error: applicationsError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, country_code, registration_number, charity_number, annual_revenue_cents, cra_good_standing",
      )
      .eq("id", organization.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("platform_user_roles")
      .select("role")
      .eq("user_id", member.id)
      .in("role", ["super_admin", "grants_admin", "finance_admin"]),
    supabase
      .from("grant_rounds")
      .select(
        "id, name, status, opens_at, closes_at, decision_at, award_amount_cents, available_awards, budget_cents, public_notes, grant_programs(name, type, description)",
      )
      .neq("status", "draft")
      .order("opens_at", { ascending: true }),
    supabase
      .from("grant_applications")
      .select(
        "id, round_id, status, focus_area, funding_request, expected_outcome, requested_amount_cents, annual_revenue_cents, cra_good_standing, registered_in_canada, submitted_at, withdrawn_at, updated_at, grant_rounds(name), grant_awards(id, status, amount_cents, paid_on, payment_reference, impact_story, impact_story_consent, outcome_received_at)",
      )
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (organizationError) throw organizationError;
  if (subscriptionError) throw subscriptionError;
  if (rolesError) throw rolesError;
  if (roundsError) throw roundsError;
  if (applicationsError) throw applicationsError;

  const canAdministerGrants = (roles ?? []).some((role) =>
    grantsAdminRoles.has(role.role as PlatformRole),
  );
  let adminApplications: GrantApplicationSummary[] = [];

  if (canAdministerGrants) {
    const { data, error } = await admin
      .from("grant_applications")
      .select(
        "id, round_id, status, focus_area, funding_request, expected_outcome, requested_amount_cents, annual_revenue_cents, cra_good_standing, registered_in_canada, submitted_at, withdrawn_at, updated_at, organizations(name), grant_rounds(name), grant_awards(id, status, amount_cents, paid_on, payment_reference, impact_story, impact_story_consent, outcome_received_at), grant_application_reviews(id, score, recommendation, internal_notes, reviewed_at)",
      )
      .in("status", ["submitted", "in_review", "shortlisted", "approved", "declined"])
      .order("updated_at", { ascending: false });

    if (error) throw error;
    adminApplications = (data ?? []).map((application) =>
      mapApplication(application),
    );
  }

  const applicationIds = (applications ?? []).map((application) => application.id);
  const applicantFeedbackByApplication = new Map<
    string,
    GrantApplicationSummary["reviews"]
  >();

  if (applicationIds.length > 0) {
    const { data: applicantFeedback, error: applicantFeedbackError } = await admin
      .from("grant_application_reviews")
      .select("id, application_id, recommendation, reviewed_at")
      .in("application_id", applicationIds)
      .not("recommendation", "is", null)
      .order("reviewed_at", { ascending: false });

    if (applicantFeedbackError) throw applicantFeedbackError;

    for (const review of applicantFeedback ?? []) {
      const reviews = applicantFeedbackByApplication.get(review.application_id) ?? [];
      reviews.push({
        id: review.id,
        internalNotes: null,
        recommendation: review.recommendation,
        reviewedAt: review.reviewed_at,
        score: null,
      });
      applicantFeedbackByApplication.set(review.application_id, reviews);
    }
  }

  const existingApplicationByRound = new Map(
    (applications ?? []).map((application) => [
      application.round_id,
      application.id,
    ]),
  );

  return {
    rounds: (rounds ?? []).map((round) => {
      const program = singleRelation(round.grant_programs);
      return {
        id: round.id,
        name: round.name,
        programName: program?.name ?? "Olea Gives",
        programType: program?.type ?? "quarterly",
        description: program?.description ?? "",
        status: round.status,
        opensAt: round.opens_at,
        closesAt: round.closes_at,
        decisionAt: round.decision_at,
        awardAmountCents: round.award_amount_cents,
        availableAwards: round.available_awards,
        budgetCents: round.budget_cents,
        publicNotes: round.public_notes,
        existingApplicationId: existingApplicationByRound.get(round.id) ?? null,
      };
    }),
    applications: (applications ?? []).map((application) =>
      mapApplication(
        application,
        applicantFeedbackByApplication.get(application.id),
      ),
    ),
    adminApplications,
    canAdministerGrants,
    organizationDefaults: {
      annualRevenueCents: organizationRecord.annual_revenue_cents,
      craGoodStanding: organizationRecord.cra_good_standing,
      registeredInCanada: organizationRecord.country_code === "CA",
    },
  };
}
