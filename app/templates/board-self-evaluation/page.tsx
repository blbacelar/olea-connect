import { getOrg, getTemplateSession } from "@/lib/db";

import { BoardEvaluationEditor } from "./survey-editor";

export default async function BoardSelfEvaluationPage() {
  const [organization, session] = await Promise.all([
    getOrg(),
    getTemplateSession(),
  ]);

  return (
    <BoardEvaluationEditor
      initialSession={session}
      organization={organization}
    />
  );
}
