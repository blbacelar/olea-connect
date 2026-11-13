import { redirect } from "next/navigation";

import { AnonymousSurveyForm } from "@/app/modules/ed-review/survey/[token]/survey-form";
import { SourceSurveyForm } from "@/app/modules/ed-review/survey/[token]/source-survey-form";
import { getPublicEdReviewCampaign } from "@/lib/data/ed-review";

export const dynamic = "force-dynamic";

export default async function PublicEdReviewSurveyPage(
  props: {
    params: Promise<{ token: string }>;
    searchParams?: Promise<{ submitted?: string; at?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const campaign = await getPublicEdReviewCampaign(params.token);
  if (!campaign) redirect("/modules/ed-review/survey/unavailable");
  if (campaign.instrumentVersion === 2) {
    return (
      <SourceSurveyForm
        campaign={campaign}
        submitted={searchParams?.submitted === "1"}
        submittedAt={searchParams?.at}
        token={params.token}
      />
    );
  }
  return (
    <AnonymousSurveyForm
      campaign={campaign}
      submitted={searchParams?.submitted === "1"}
      token={params.token}
    />
  );
}
