import { BoardTrainingHome } from "@/app/modules/board-training/_components/board-training-home";
import { getTrainingHome } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BoardTrainingPage() {
  const data = await getTrainingHome();
  const language = getRequestLocale() === "fr-CA" ? "fr" : "en";
  return <BoardTrainingHome data={data} language={language} />;
}
