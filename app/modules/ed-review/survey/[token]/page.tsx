import { redirect } from "next/navigation";

import { AnonymousSurveyForm } from "@/app/modules/ed-review/survey/[token]/survey-form";
import { getPublicEdReviewCampaign } from "@/lib/data/ed-review";

export const dynamic = "force-dynamic";

export default async function PublicEdReviewSurveyPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { submitted?: string };
}) {
  const campaign = await getPublicEdReviewCampaign(params.token);
  if (!campaign) redirect("/modules/ed-review/survey/unavailable");
  return (
    <AnonymousSurveyForm
      campaign={campaign}
      submitted={searchParams?.submitted === "1"}
      token={params.token}
    />
  );
}
