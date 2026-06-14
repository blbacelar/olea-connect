import { requireMemberContext } from "@/lib/data/member-context";
import { getTemplateSession } from "@/lib/data/templates";

import { BoardEvaluationEditor } from "./survey-editor";

export default async function BoardSelfEvaluationPage() {
  const [{ organization }, session] = await Promise.all([
    requireMemberContext(),
    getTemplateSession(),
  ]);

  return (
    <BoardEvaluationEditor
      initialSession={session}
      organization={organization}
    />
  );
}
