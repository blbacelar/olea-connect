import { getStakeholderSurveyManagementData } from "@/lib/data/strategic-stakeholder-surveys";

import { StakeholderSurveys } from "./stakeholder-surveys";

export const dynamic = "force-dynamic";

export default async function StrategicSurveysPage() {
  return <StakeholderSurveys data={await getStakeholderSurveyManagementData()} />;
}
