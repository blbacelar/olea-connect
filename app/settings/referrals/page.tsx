import { notFound } from "next/navigation";

import { getReferralAdminData } from "@/lib/data/referrals";

import {
  updateReferralMilestone,
  updateReferralPayout,
  updateReferralProgramSettings,
  updateReferrerStatus,
} from "./actions";
import { ReferralAdminView } from "./referral-admin-view";

async function saveReferralProgramSettings(formData: FormData) {
  "use server";
  await updateReferralProgramSettings(formData);
}

async function saveReferrerStatus(formData: FormData) {
  "use server";
  await updateReferrerStatus(formData);
}

async function saveReferralMilestone(formData: FormData) {
  "use server";
  await updateReferralMilestone(formData);
}

async function saveReferralPayout(formData: FormData) {
  "use server";
  await updateReferralPayout(formData);
}

export default async function ReferralAdminPage() {
  let data: Awaited<ReturnType<typeof getReferralAdminData>>;

  try {
    data = await getReferralAdminData();
  } catch {
    notFound();
  }

  return (
    <ReferralAdminView
      data={data}
      saveReferralMilestone={saveReferralMilestone}
      saveReferralPayout={saveReferralPayout}
      saveReferralProgramSettings={saveReferralProgramSettings}
      saveReferrerStatus={saveReferrerStatus}
    />
  );
}
