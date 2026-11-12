"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { reviewBoardEvaluationMeetingComment } from "./prototype-actions";
import type { EvaluationActionState } from "./actions";

type Comment = { id: string; body: string; redactedBody: string | null; approved: boolean };
const idle: EvaluationActionState = { status: "idle", message: "" };

function Submit({ french }: { french: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{pending ? (french ? "Enregistrement..." : "Saving...") : (french ? "Enregistrer la révision" : "Save review")}</Button>;
}

function CommentReview({ comment, surveyId, french }: { comment: Comment; surveyId: string; french: boolean }) {
  const [state, action] = useActionState(reviewBoardEvaluationMeetingComment, idle);
  const [redacted, setRedacted] = useState(comment.redactedBody || "");
  const [approved, setApproved] = useState(comment.approved);
  return <form action={action} className="space-y-3 rounded-lg border p-4">
    <Input type="hidden" name="surveyId" value={surveyId} readOnly />
    <Input type="hidden" name="commentId" value={comment.id} readOnly />
    <Input type="hidden" name="redacted" value={redacted} readOnly />
    <Input type="hidden" name="approved" value={String(approved)} readOnly />
    <p className="whitespace-pre-wrap text-sm text-slate-800">{comment.body}</p>
    <div className="space-y-2"><Label htmlFor={`meeting-comment-redacted-${comment.id}`}>{french ? "Reformulation sûre" : "Safe paraphrase"}</Label>
      <Textarea id={`meeting-comment-redacted-${comment.id}`} value={redacted} maxLength={4000}
        onChange={(event) => setRedacted(event.target.value)}
        placeholder={french ? "Retirez les noms et les détails identifiables" : "Remove names and identifying details"} /></div>
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={approved} onChange={(event) => setApproved(event.target.checked)} />
      {french ? "Examiné et sûr à utiliser dans un rapport" : "Reviewed and safe to use in a report"}</label>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-red-800" : "text-sm text-green-800"}>{state.message}</p> : null}
    <Submit french={french} />
  </form>;
}

export function BoardEvaluationMeetingComments({ comments, surveyId, french }: { comments: Comment[]; surveyId: string; french: boolean }) {
  if (!comments.length) return null;
  return <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{french ? "Examiner les commentaires anonymes" : "Review anonymous meeting comments"} ({comments.length})</summary>
    <p className="mt-3 text-sm text-slate-600">{french
      ? "Les commentaires ne sont visibles ici qu’après cinq réponses. Reformulez les détails identifiables avant de les utiliser."
      : "Comments appear here only after five responses. Paraphrase identifying details before using them."}</p>
    <div className="mt-4 space-y-3">{comments.map((comment) => <CommentReview key={comment.id} comment={comment} surveyId={surveyId} french={french} />)}</div>
  </details>;
}
