import { cookies } from "next/headers";

import { EdReviewWorkspace } from "@/app/modules/ed-review/_components/ed-review-workspace";
import { getEdReviewData } from "@/lib/data/ed-review";

export const dynamic = "force-dynamic";

export default async function EdReviewPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const data = await getEdReviewData();
  const newCampaignLink = cookies().get("ed_review_new_campaign_link")?.value;
  return (
    <EdReviewWorkspace
      activeTab={searchParams?.tab}
      data={data}
      newCampaignLink={newCampaignLink}
    />
  );
}
