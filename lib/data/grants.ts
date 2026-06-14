import "server-only";

import type {
  GrantApplicationSummary,
  GrantRound,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

export async function getGrantsData(): Promise<{
  rounds: GrantRound[];
  applications: GrantApplicationSummary[];
}> {
  const { organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { data: rounds, error: roundsError },
    { data: applications, error: applicationsError },
  ] = await Promise.all([
    supabase
      .from("grant_rounds")
      .select(
        "id, name, status, opens_at, closes_at, award_amount_cents, available_awards, grant_programs(name, description)",
      )
      .order("opens_at", { ascending: false }),
    supabase
      .from("grant_applications")
      .select(
        "id, status, requested_amount_cents, submitted_at, updated_at, grant_rounds(name)",
      )
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (roundsError) throw roundsError;
  if (applicationsError) throw applicationsError;

  return {
    rounds: (rounds ?? []).map((round) => {
      const program = Array.isArray(round.grant_programs)
        ? round.grant_programs[0]
        : round.grant_programs;
      return {
        id: round.id,
        name: round.name,
        programName: program?.name ?? "Olea Gives",
        description: program?.description ?? "",
        status: round.status,
        opensAt: round.opens_at,
        closesAt: round.closes_at,
        awardAmountCents: round.award_amount_cents,
        availableAwards: round.available_awards,
      };
    }),
    applications: (applications ?? []).map((application) => {
      const round = Array.isArray(application.grant_rounds)
        ? application.grant_rounds[0]
        : application.grant_rounds;
      return {
        id: application.id,
        roundName: round?.name ?? "Grant application",
        status: application.status,
        requestedAmountCents: application.requested_amount_cents,
        submittedAt: application.submitted_at,
        updatedAt: application.updated_at,
      };
    }),
  };
}
