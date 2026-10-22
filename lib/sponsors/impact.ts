export function aggregatePartnerRegions(
  placements: Array<{ sponsorshipId: string; region: string | null; status: string }>,
  sponsorshipId: string,
  minimumGroupSize = 3,
) {
  const counts = new Map<string, number>();
  for (const placement of placements) {
    if (placement.sponsorshipId !== sponsorshipId || placement.status === "canceled") continue;
    const region = placement.region?.trim();
    if (!region) continue;
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, count]) => count >= minimumGroupSize)
    .map(([region, count]) => ({ region, count }))
    .sort((left, right) => right.count - left.count || left.region.localeCompare(right.region));
}

export function summarizeFundedBoards(
  placements: Array<{ sponsorshipId: string; planId: string; status: string }>,
  sponsorshipId: string,
) {
  const included = placements.filter((placement) =>
    placement.sponsorshipId === sponsorshipId && placement.status !== "canceled"
  );
  return {
    sponsorshipId,
    placed: included.length,
    active: included.filter((placement) => placement.status === "active").length,
    seedling: included.filter((placement) => placement.planId === "seedling").length,
    roots: included.filter((placement) => placement.planId === "roots").length,
  };
}

export function reportedBudgetMatchesTier(
  annualBudgetRange: string | null,
  planId: "seedling" | "roots",
) {
  if (!annualBudgetRange) return true;
  return planId === "seedling"
    ? ["under-250k", "250k-500k"].includes(annualBudgetRange)
    : ["500k-1m", "1m-2m"].includes(annualBudgetRange);
}
