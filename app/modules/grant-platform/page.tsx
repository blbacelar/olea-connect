import { GrantPlatformWorkspace } from "@/app/modules/grant-platform/_components/grant-platform-workspace";
import { getGrantPlatformData } from "@/lib/data/grant-platform";
import { requireMemberContext } from "@/lib/data/member-context";

export const dynamic = "force-dynamic";

export default async function GrantPlatformPage(
  props: {
    searchParams?: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const [{ member }, data] = await Promise.all([requireMemberContext(), getGrantPlatformData()]);

  return <GrantPlatformWorkspace activeTab={searchParams?.tab} data={data} role={member.role} />;
}
