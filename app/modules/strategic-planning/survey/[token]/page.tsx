import { getPublicStakeholderSurvey } from "@/lib/data/strategic-stakeholder-surveys";

import { StakeholderSurveyForm } from "./survey-form";

export const dynamic = "force-dynamic";

export default async function StakeholderSurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const survey = await getPublicStakeholderSurvey(token);
  if (!survey) return <main className="mx-auto max-w-2xl px-4 py-12">
    <h1 className="text-2xl font-semibold">Survey unavailable</h1>
    <p className="mt-2 text-slate-600">This anonymous survey link is invalid or closed.</p>
  </main>;
  return <StakeholderSurveyForm token={token} survey={survey} />;
}
