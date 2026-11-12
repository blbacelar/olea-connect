import { notFound } from "next/navigation";

import { getPublicBoardEvaluationSurvey } from "@/lib/board-evaluation/public-survey";

import { AnonymousEvaluationForm } from "../../anonymous-evaluation-form";

export const dynamic = "force-dynamic";

export default async function PostMeetingEvaluationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const survey = await getPublicBoardEvaluationSurvey("meeting", token);
  if (!survey) notFound();
  return <AnonymousEvaluationForm survey={survey} />;
}
