import { BoardRecruitmentWorkspace } from "@/app/modules/board-recruitment/_components/board-recruitment-workspace";
import { getBoardRecruitmentData } from "@/lib/data/board-recruitment";
import type { RecruitmentTab } from "@/lib/board-recruitment/types";

export const dynamic = "force-dynamic";

const tabValues: RecruitmentTab[] = [
  "overview",
  "survey",
  "matrix",
  "terms",
  "committees",
  "report",
];

function resolveTab(value: string | undefined): RecruitmentTab {
  return tabValues.includes(value as RecruitmentTab)
    ? (value as RecruitmentTab)
    : "overview";
}

export default async function BoardRecruitmentPage({
  searchParams,
}: {
  searchParams?: { tab?: string; refresh?: string };
}) {
  const data = await getBoardRecruitmentData();
  return (
    <BoardRecruitmentWorkspace
      key={searchParams?.refresh ?? "initial"}
      data={data}
      activeTab={resolveTab(searchParams?.tab)}
    />
  );
}
