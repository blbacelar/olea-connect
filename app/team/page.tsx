import { getMember, getOrg } from "@/lib/db";

import { TeamWorkspace } from "./team-workspace";

export default async function TeamPage() {
  const [member, organization] = await Promise.all([getMember(), getOrg()]);
  return <TeamWorkspace member={member} organization={organization} />;
}
