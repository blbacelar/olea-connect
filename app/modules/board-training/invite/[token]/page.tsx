import { BoardTrainingInvite } from "@/app/modules/board-training/_components/board-training-invite";
import { getTrainingInvitationPreview } from "@/lib/data/board-training";

export const dynamic = "force-dynamic";

export default async function BoardTrainingInvitationPage({ params, searchParams }: {
  params: { token: string }; searchParams?: { lang?: string };
}) {
  const preview = await getTrainingInvitationPreview(params.token);
  const language = searchParams?.lang === "fr" || (searchParams?.lang !== "en" && preview.language === "fr") ? "fr" : "en";
  return <BoardTrainingInvite token={params.token} valid={preview.valid} language={language} organizationName={preview.organizationName} />;
}
