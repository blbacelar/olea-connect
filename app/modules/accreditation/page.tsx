import { AccreditationWorkspace } from "@/app/modules/accreditation/_components/accreditation-workspace";
import { getAccreditationWorkspaceData } from "@/lib/data/accreditation";

export const dynamic = "force-dynamic";

export default async function AccreditationPage({
  searchParams,
}: {
  searchParams?: { tab?: string; template?: string };
}) {
  const data = await getAccreditationWorkspaceData();

  return (
    <AccreditationWorkspace
      activeTab={searchParams?.tab}
      activeTemplateCode={searchParams?.template}
      data={data}
    />
  );
}
