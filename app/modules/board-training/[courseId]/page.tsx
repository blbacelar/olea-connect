import { notFound, redirect } from "next/navigation";

import { BoardTrainingPlayer } from "@/app/modules/board-training/_components/board-training-player";
import { getTrainingCoursePageData, hasTrainingAccess } from "@/lib/data/board-training";

export const dynamic = "force-dynamic";

export default async function BoardTrainingCoursePage({ params }: { params: { courseId: string } }) {
  if (!(await hasTrainingAccess())) redirect("/modules/board-training");
  if (params.courseId !== "essentials" && params.courseId !== "refresher") notFound();
  const data = await getTrainingCoursePageData(params.courseId);
  if (!data) redirect("/modules/board-training");
  return <BoardTrainingPlayer key={`${data.enrollment.id}-${data.enrollment.locale}`} data={data} />;
}
