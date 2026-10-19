import { getBoardEvaluationData } from "@/lib/data/board-evaluation";

import { BoardEvaluationWorkspace } from "./board-evaluation-workspace";

export const dynamic = "force-dynamic";

export default async function BoardEvaluationPage({
  searchParams,
}: {
  searchParams?: Promise<{ cycle?: string }>;
}) {
  const params = await searchParams;
  const data = await getBoardEvaluationData(params?.cycle);
  return <BoardEvaluationWorkspace data={data} />;
}
