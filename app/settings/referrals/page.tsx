import { notFound, redirect } from "next/navigation";

import { getReferralAdminData } from "@/lib/data/referrals";

import {
  updateReferralMilestone,
  updateReferralPayout,
  updateReferralProgramSettings,
  updateReferrerStatus,
} from "./actions";
import { ReferralAdminView } from "./referral-admin-view";

function showActionResult(result: { ok: boolean; message: string }) {
  const params = new URLSearchParams({
    status: result.ok ? "success" : "error",
    message: result.message,
  });
  redirect(`/settings/referrals?${params}`);
}

async function saveReferralProgramSettings(formData: FormData) {
  "use server";
  showActionResult(await updateReferralProgramSettings(formData));
}

async function saveReferrerStatus(formData: FormData) {
  "use server";
  showActionResult(await updateReferrerStatus(formData));
}

async function saveReferralMilestone(formData: FormData) {
  "use server";
  showActionResult(await updateReferralMilestone(formData));
}

async function saveReferralPayout(formData: FormData) {
  "use server";
  showActionResult(await updateReferralPayout(formData));
}

export default async function ReferralAdminPage({
  searchParams,
}: {
  searchParams: { status?: string; message?: string };
}) {
  let data: Awaited<ReturnType<typeof getReferralAdminData>>;

  try {
    data = await getReferralAdminData();
  } catch {
    notFound();
  }

  const notice = searchParams.status === "success" || searchParams.status === "error"
    ? searchParams.message?.slice(0, 200)
    : null;

  return (
    <>
      {notice ? (
        <div
          role={searchParams.status === "error" ? "alert" : "status"}
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${searchParams.status === "error"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800"}`}
        >
          {notice}
        </div>
      ) : null}
      <ReferralAdminView
        data={data}
        saveReferralMilestone={saveReferralMilestone}
        saveReferralPayout={saveReferralPayout}
        saveReferralProgramSettings={saveReferralProgramSettings}
        saveReferrerStatus={saveReferrerStatus}
      />
    </>
  );
}
