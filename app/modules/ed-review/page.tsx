import { cookies } from "next/headers";

import { EdReviewWorkspace } from "@/app/modules/ed-review/_components/ed-review-workspace";
import { EdReviewBoardChairRecovery } from "@/app/modules/ed-review/_components/ed-review-board-chair-recovery";
import { EdReviewAccessRestricted } from "@/app/modules/ed-review/_components/ed-review-access-restricted";
import {
  getEdReviewBoardChairRecoveryData,
  getEdReviewData,
  EdReviewMembershipRequiredError,
  EdReviewReviewerAssignmentRequiredError,
} from "@/lib/data/ed-review";

export const dynamic = "force-dynamic";

export default async function EdReviewPage(
  props: {
    searchParams?: Promise<{
      tab?: string;
      recovery?: string;
      compile?: string;
      access?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  let data;
  try {
    data = await getEdReviewData();
  } catch (error) {
    if (error instanceof EdReviewMembershipRequiredError) {
      return <EdReviewAccessRestricted reason="membership" />;
    }
    if (!(error instanceof EdReviewReviewerAssignmentRequiredError)) {
      throw error;
    }
    const recovery = await getEdReviewBoardChairRecoveryData();
    if (recovery) {
      return (
        <EdReviewBoardChairRecovery
          data={recovery}
          appointed={searchParams?.recovery === "assigned"}
          failed={searchParams?.recovery === "failed"}
        />
      );
    }
    return <EdReviewAccessRestricted />;
  }
  const newCampaignLink = (await cookies()).get("ed_review_new_campaign_link")?.value;
  return (
    <EdReviewWorkspace
      activeTab={searchParams?.tab}
      accessOutcome={searchParams?.access}
      compileFailed={searchParams?.compile === "failed"}
      data={data}
      newCampaignLink={newCampaignLink}
    />
  );
}
