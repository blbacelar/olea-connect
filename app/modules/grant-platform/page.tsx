import { GrantPlatformWorkspace } from "@/app/modules/grant-platform/_components/grant-platform-workspace";
import { getGrantPlatformData } from "@/lib/data/grant-platform";

export const dynamic = "force-dynamic";

export default async function GrantPlatformPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const data = await getGrantPlatformData();

  return <GrantPlatformWorkspace activeTab={searchParams?.tab} data={data} />;
}
