import { getBoardEvaluationData } from "@/lib/data/board-evaluation";

import { BoardEvaluationWorkspace } from "./board-evaluation-workspace";

export const dynamic = "force-dynamic";

export default async function BoardEvaluationPage({
  searchParams,
}: {
  searchParams?: { cycle?: string };
}) {
  const data = await getBoardEvaluationData(searchParams?.cycle);
  return <BoardEvaluationWorkspace data={data} />;
}
