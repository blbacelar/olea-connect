import { PageHeader } from "@/components/PageHeader";
import { getConsultingData } from "@/lib/data/consulting";

import { ConsultingWorkspace } from "./consulting-workspace";

export default async function ConsultingPage() {
  const consulting = await getConsultingData();

  return (
    <div>
      <PageHeader
        title="Consulting"
        description="Review existing advisory requests, remaining hours, and support history."
      />

      <ConsultingWorkspace
        canManageConsulting={consulting.canManageConsulting}
        hourSummary={consulting.hourSummary}
        isHarvestEntitled={consulting.isHarvestEntitled}
        memberRequests={consulting.memberRequests}
        organizationName={consulting.organization.name}
        staffRequests={consulting.staffRequests}
        staffUsers={consulting.staffUsers}
      />
    </div>
  );
}
