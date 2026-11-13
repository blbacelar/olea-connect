import { getBoardEvaluationPrototypeData } from "@/lib/data/board-evaluation-prototype";

import { BoardEvaluationPrototypeWorkspace } from "./prototype-workspace";

export const dynamic = "force-dynamic";

export default async function BoardEvaluationPage({
  searchParams,
}: {
  searchParams?: Promise<{ cycle?: string }>;
}) {
  const params = await searchParams;
  const data = await getBoardEvaluationPrototypeData(params?.cycle);
  return <BoardEvaluationPrototypeWorkspace data={data} />;
}
