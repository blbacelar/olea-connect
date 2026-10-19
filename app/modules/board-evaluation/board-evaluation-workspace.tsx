"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

import { PageHeader } from "@/components/PageHeader";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { evaluationQuestions, minimumEvaluationResponses, nextAvailableEvaluationYear } from "@/lib/board-evaluation/domain";

import {
  closeBoardEvaluation,
  extendBoardEvaluationDeadline,
  openBoardEvaluation,
  saveBoardEvaluationAction,
  submitBoardEvaluation,
  type EvaluationActionState,
} from "./actions";

type Data = Awaited<ReturnType<typeof import("@/lib/data/board-evaluation").getBoardEvaluationData>>;
const idle: EvaluationActionState = { status: "idle", message: "" };

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving..." : children}</Button>;
}

function Notice({ state }: { state: EvaluationActionState }) {
  return state.message ? (
    <p role="status" className={`rounded-lg border p-3 text-sm ${
      state.status === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-green-200 bg-green-50 text-green-800"
    }`}>{state.message}</p>
  ) : null;
}

function OpenCycle({ suggestedYear, isFrench }: { suggestedYear: number | null; isFrench: boolean }) {
  const [state, action] = useFormState(openBoardEvaluation, idle);
  if (suggestedYear === null) {
    return <Card><CardContent className="p-6 text-sm text-slate-600">
      {isFrench ? "Toutes les années d'évaluation disponibles jusqu'en 2100 sont déjà utilisées." : "Every available evaluation year through 2100 has already been used."}
    </CardContent></Card>;
  }
  return (
    <Card>
      <CardHeader><CardTitle>Start an annual board evaluation</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Notice state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Evaluation year
              <Input key={suggestedYear} name="year" type="number" min={2000} max={2100} step={1} required
                defaultValue={suggestedYear} className="mt-2" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Response deadline
              <Input name="closesOn" type="date" min={new Date().toISOString().slice(0, 10)} className="mt-2" />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            {isFrench
              ? `Une seule évaluation annuelle peut être créée par année. ${suggestedYear} est la prochaine année disponible. Partagez ce module avec les membres actifs du conseil. La date limite est facultative et doit être aujourd'hui ou plus tard.`
              : `Only one annual evaluation can be created per year. ${suggestedYear} is the next available year. Share this module with active board members. The deadline is optional and must be today or later.`}
          </p>
          <Submit>Open evaluation</Submit>
        </form>
      </CardContent>
    </Card>
  );
}

function CloseCycle({ cycleId, responseCount }: { cycleId: string; responseCount: number }) {
  const [state, action] = useFormState(closeBoardEvaluation, idle);
  if (responseCount < minimumEvaluationResponses) {
    return <p className="text-sm text-slate-600">At least three board members must respond before you can close the evaluation.</p>;
  }
  return (
    <Dialog>
      <DialogTrigger asChild><Button type="button" variant="outline">Close evaluation and show results</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this annual evaluation?</DialogTitle>
          <DialogDescription>
            Board members will no longer be able to submit or update ratings. The aggregate results will become visible to your board. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <Input name="cycleId" type="hidden" value={cycleId} readOnly />
          <Notice state={state} />
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Keep collecting responses</Button></DialogClose>
            <Submit>Close evaluation</Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExtendDeadline({ cycleId }: { cycleId: string }) {
  const [state, action] = useFormState(extendBoardEvaluationDeadline, idle);
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <Input name="cycleId" type="hidden" value={cycleId} readOnly />
      <Notice state={state} />
      <label className="block text-sm font-semibold text-slate-700">
        New response deadline
        <Input name="closesOn" type="date" min={new Date().toISOString().slice(0, 10)} required className="mt-2 bg-white" />
      </label>
      <p className="text-xs text-slate-500">The deadline passed. Extend it so board members can finish their responses.</p>
      <Submit>Extend deadline</Submit>
    </form>
  );
}

function RatingForm({ cycleId, hasSubmitted, ownScores }: {
  cycleId: string;
  hasSubmitted: boolean;
  ownScores: Data["ownScores"];
}) {
  const [state, action] = useFormState(submitBoardEvaluation, idle);
  return (
    <Card>
      <CardHeader><CardTitle>{hasSubmitted ? "Update your ratings" : "Your board evaluation"}</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <Input name="cycleId" type="hidden" value={cycleId} readOnly />
          <Notice state={state} />
          <p className="text-sm leading-6 text-slate-600">Rate each area from 1 (needs significant improvement) to 5 (working very well).</p>
          <p className="text-sm leading-6 text-slate-600">You can update your response while the evaluation remains open.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {evaluationQuestions.map((question) => (
              <label key={question.id} className="text-sm font-semibold text-slate-700">
                {question.en}
                <FormSelect name={question.id} required placeholder="Choose 1 to 5"
                  defaultValue={ownScores ? String(ownScores[question.id]) : undefined}
                  options={[1, 2, 3, 4, 5].map((rating) => ({ label: String(rating), value: String(rating) }))} />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Aggregate ratings appear only after the evaluation closes with at least three responses. Individual ratings are not displayed to the board or sponsors.</p>
          <Submit>{hasSubmitted ? "Update ratings" : "Submit ratings"}</Submit>
        </form>
      </CardContent>
    </Card>
  );
}

function ImprovementActionForm({ cycleId, item }: {
  cycleId: string;
  item?: Data["actions"][number];
}) {
  const [state, action] = useFormState(saveBoardEvaluationAction, idle);
  return (
    <form action={action} className="space-y-4">
      <Input name="cycleId" type="hidden" value={cycleId} readOnly />
      <Input name="actionId" type="hidden" value={item?.id ?? ""} readOnly />
      <Notice state={state} />
      <label className="block text-sm font-semibold text-slate-700">
        Improvement action
        <Input name="title" required minLength={3} maxLength={200}
          defaultValue={item?.title ?? ""}
          placeholder="Example: Review the finance dashboard each quarter" className="mt-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">
          Owner
          <Input name="ownerName" maxLength={160} defaultValue={item?.ownerName ?? ""}
            placeholder="Board committee or lead" className="mt-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Due date
          <Input name="dueOn" type="date" defaultValue={item?.dueOn ?? ""} className="mt-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <FormSelect name="status" defaultValue={item?.status ?? "planned"} placeholder="Choose status"
            options={[
              { label: "Planned", value: "planned" },
              { label: "In progress", value: "in_progress" },
              { label: "Completed", value: "completed" },
            ]} />
        </label>
      </div>
      <Submit>{item ? "Save action" : "Add action"}</Submit>
    </form>
  );
}

function ImprovementActionEditor({ cycleId, item }: {
  cycleId: string;
  item?: Data["actions"][number];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant={item ? "outline" : "default"}>
          {item ? "Edit action" : "Add action"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit improvement action" : "Add improvement action"}</DialogTitle>
          <DialogDescription>Record the next step, its owner, and a target date for follow-up.</DialogDescription>
        </DialogHeader>
        <ImprovementActionForm cycleId={cycleId} item={item} />
      </DialogContent>
    </Dialog>
  );
}

export function BoardEvaluationWorkspace({ data }: { data: Data }) {
  const isFrench = useLocaleContext().locale === "fr-CA";
  if (!data.hasAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Board Evaluation" description="Assess board practice and turn findings into improvements." />
        <Card><CardContent className="flex flex-col items-start gap-4 p-6">
          <ClipboardCheck className="size-8 text-olea-green" />
          <p className="text-slate-700">Board Evaluation is included with Roots and Canopy or an active add-on.</p>
          <Button asChild><Link href="/subscription">View membership</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const cycle = data.cycle;
  const suggestedYear = nextAvailableEvaluationYear(
    data.cycles.map((item) => item.year), new Date().getUTCFullYear(),
  );
  const acceptingResponses = cycle?.status === "open" &&
    (!cycle.closesOn || cycle.closesOn >= new Date().toISOString().slice(0, 10));
  return (
    <div className="space-y-6">
      <PageHeader title="Annual Board Evaluation" description="Collect board perspectives, review shared strengths, and track the next actions." />
      <p className="rounded-lg border bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {isFrench
          ? "Cette évaluation annuelle recueille les réponses privées de plusieurs membres du conseil. Pour une fiche individuelle à imprimer, utilisez le "
          : "This annual evaluation collects private responses from multiple board members. For an individual printable worksheet, use the "}
        <Link href="/templates/board-self-evaluation" className="font-semibold text-olea-green underline-offset-2 hover:underline">
          {isFrench ? "modèle d'autoévaluation du conseil" : "Board Self-Evaluation template"}
        </Link>.
        {isFrench
          ? " Les réponses aux anciens modèles ne figurent pas dans les résultats annuels."
          : " Earlier template responses do not appear in annual results."}
      </p>
      {data.canManage && !data.hasOpenCycle && cycle ? <OpenCycle suggestedYear={suggestedYear} isFrench={isFrench} /> : null}
      {data.cycles.length > 1 ? (
        <nav aria-label="Evaluation years" className="flex flex-wrap gap-2">
          {data.cycles.map((item) => (
            <Button key={item.id} asChild size="sm" variant={item.id === cycle?.id ? "default" : "outline"}>
              <Link href={`/modules/board-evaluation?cycle=${item.id}`}>{item.year}</Link>
            </Button>
          ))}
        </nav>
      ) : null}
      {!cycle ? data.canManage ? <OpenCycle suggestedYear={suggestedYear} isFrench={isFrench} /> : (
        <Card><CardContent className="p-6 text-sm text-slate-600">Your board has not opened an evaluation yet.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>{cycle.year} board evaluation</CardTitle>
              <Badge variant="outline">{cycle.status === "closed" ? "Closed" : acceptingResponses ? "Open" : "Deadline passed"}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>{data.responseCount} board {data.responseCount === 1 ? "member has" : "members have"} responded.</p>
              {cycle.closesOn ? <p>Response deadline: {cycle.closesOn}</p> : null}
              {data.canManage && cycle.status === "open" ? <CloseCycle cycleId={cycle.id} responseCount={data.responseCount} /> : null}
              {data.canManage && cycle.status === "open" && !acceptingResponses ? <ExtendDeadline cycleId={cycle.id} /> : null}
            </CardContent>
          </Card>
          {acceptingResponses ? <RatingForm cycleId={cycle.id} hasSubmitted={data.hasSubmitted} ownScores={data.ownScores} /> : null}
          <Card>
            <CardHeader><CardTitle>Board-level results</CardTitle></CardHeader>
            <CardContent>
              {data.averages.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.averages.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                      <span>{item.en}</span>
                      <Badge variant="outline" className="shrink-0 whitespace-nowrap">{item.average?.toFixed(1)} / 5</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-600">Aggregate results appear after the evaluation closes with at least three responses.</p>}
            </CardContent>
          </Card>
          {cycle.status === "closed" ? <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>Improvement actions</CardTitle>
              {data.canManage ? <ImprovementActionEditor cycleId={cycle.id} /> : null}
            </CardHeader>
            <CardContent className="space-y-5">
              {data.actions.length ? (
                <ul className="divide-y rounded-lg border px-4">
                  {data.actions.map((item) => (
                    <li key={item.id} className="space-y-3 py-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-medium text-slate-900">{item.title}</span>
                        <Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge>
                      </div>
                      <span className="text-slate-500">{item.ownerName || "No owner"} · {item.dueOn || "No due date"}</span>
                      {data.canManage ? <ImprovementActionEditor cycleId={cycle.id} item={item} /> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-600">No improvement actions recorded yet.</p>}
            </CardContent>
          </Card> : null}
        </>
      )}
    </div>
  );
}
