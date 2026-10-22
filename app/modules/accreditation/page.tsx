import { AccreditationWorkspace } from "@/app/modules/accreditation/_components/accreditation-workspace";
import { getAccreditationWorkspaceData } from "@/lib/data/accreditation";

export const dynamic = "force-dynamic";

export default async function AccreditationPage(
  props: {
    searchParams?: Promise<{ tab?: string; template?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const data = await getAccreditationWorkspaceData();

  return (
    <AccreditationWorkspace
      activeTab={searchParams?.tab}
      activeTemplateCode={searchParams?.template}
      data={data}
    />
  );
}
