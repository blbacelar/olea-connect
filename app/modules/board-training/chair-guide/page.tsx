import { BoardTrainingChairGuide } from "@/app/modules/board-training/_components/board-training-chair-guide";
import { notFound } from "next/navigation";
import { getChairGuide } from "@/lib/board-training/content";
import { getTrainingSettings, requireTrainingContext } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ChairGuidePage({ searchParams }: { searchParams?: { session?: string; lang?: string } }) {
  const context = await requireTrainingContext();
  const settings = await getTrainingSettings(context);
  if (!context.isManager && settings.chair_user_id !== context.member.id) {
    notFound();
  }
  const language = searchParams?.lang === "fr" || (searchParams?.lang !== "en" && getRequestLocale() === "fr-CA") ? "fr" : "en";
  return <BoardTrainingChairGuide guide={getChairGuide(language)} language={language} selectedSession={searchParams?.session} />;
}
