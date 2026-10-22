import { notFound, redirect } from "next/navigation";

import { BoardTrainingLocked } from "@/app/modules/board-training/_components/board-training-locked";
import { BoardTrainingPlayer } from "@/app/modules/board-training/_components/board-training-player";
import { getTrainingCoursePageData, hasTrainingAccess } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BoardTrainingCoursePage(props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  if (!(await hasTrainingAccess())) {
    return <BoardTrainingLocked language={(await getRequestLocale()) === "fr-CA" ? "fr" : "en"} />;
  }
  if (params.courseId !== "essentials" && params.courseId !== "refresher") notFound();
  const data = await getTrainingCoursePageData(params.courseId);
  if (!data) redirect("/modules/board-training");
  return <BoardTrainingPlayer key={`${data.enrollment.id}-${data.enrollment.locale}`} data={data} />;
}
