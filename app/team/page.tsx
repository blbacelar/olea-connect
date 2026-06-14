import { getTeamData } from "@/lib/data/team";

import { TeamWorkspace } from "./team-workspace";

export default async function TeamPage() {
  const team = await getTeamData();
  return <TeamWorkspace team={team} />;
}
