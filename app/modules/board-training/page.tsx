import { BoardTrainingHome } from "@/app/modules/board-training/_components/board-training-home";
import { BoardTrainingLocked } from "@/app/modules/board-training/_components/board-training-locked";
import { getTrainingHome, hasTrainingAccess } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BoardTrainingPage() {
  const language = (await getRequestLocale()) === "fr-CA" ? "fr" : "en";
  if (!(await hasTrainingAccess())) return <BoardTrainingLocked language={language} />;
  const data = await getTrainingHome();
  return <BoardTrainingHome data={data} language={language} />;
}
