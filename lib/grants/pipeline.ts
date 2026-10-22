import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

export function filterGrantApplications(
  applications: GrantPlatformWorkspaceData["applications"],
  filters: { searchQuery: string; statusFilter: string },
) {
  const query = filters.searchQuery.trim().toLocaleLowerCase();
  return applications.filter((application) =>
    (filters.statusFilter === "all" || application.status === filters.statusFilter) &&
    (!query || `${application.roundName} ${application.funderName}`.toLocaleLowerCase().includes(query)),
  );
}

export function isGrantApplicationPastDue(
  application: GrantPlatformWorkspaceData["applications"][number],
  now = new Date(),
) {
  if (application.status !== "draft" || !application.deadlineAt) return false;
  const deadline = new Date(application.deadlineAt);
  return !Number.isNaN(deadline.getTime()) &&
    deadline.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
}
