"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Copy, FileDown, Link2, Plus } from "lucide-react";
import { useFormStatus } from "react-dom";

import { PageHeader } from "@/components/PageHeader";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { annualQuestions, meetingQuestions, scoreFlag } from "@/lib/board-evaluation/prototype-domain";
import { annualOpenQuestions } from "@/lib/board-evaluation/prototype-content";
import { parseBoardEvaluationInviteEmails } from "@/lib/board-evaluation/invitations";
import { boardEvaluationThankYouCopy } from "@/lib/board-evaluation/thank-you";
import { annualOpenQuestionsFr, annualSurveySectionsFr, meetingSurveyGroupsFr } from "@/lib/board-evaluation/prototype-content-fr";
import { meetingBankFr, meetingCategoryFr, meetingOpenBankFr, openBankFr, ratedBankFr } from "@/lib/board-evaluation/question-bank-fr";
import { nextAvailableEvaluationYear } from "@/lib/board-evaluation/domain";
import { readBoardEvaluationSummary, type SummaryPriority } from "@/lib/board-evaluation/summary-report";
import { meetingBank, meetingOpenBank, openBank, questionSelectionStatus, ratedBank, type QuestionSelection } from "@/lib/board-evaluation/question-bank";
import type { getBoardEvaluationPrototypeData } from "@/lib/data/board-evaluation-prototype";

import { BoardEvaluationAdminGuide } from "./BoardEvaluationAdminGuide";
import { BoardEvaluationExistingActions } from "./BoardEvaluationExistingActions";
import { BoardEvaluationMeetingComments } from "./BoardEvaluationMeetingComments";
import { closeBoardEvaluation, extendBoardEvaluationDeadline, openBoardEvaluation, type EvaluationActionState } from "./actions";
import { closePostMeetingEvaluation, createPostMeetingEvaluation, generateBoardEvaluationReportPdf, reviewBoardEvaluationOpenAnswer, saveBoardEvaluationConfiguration, saveBoardEvaluationSummary, saveBoardEvaluationThankYou, sendAnnualBoardEvaluationInvitations, sendMeetingBoardEvaluationInvitations } from "./prototype-actions";

type Data = Awaited<ReturnType<typeof getBoardEvaluationPrototypeData>>;
const idle: EvaluationActionState = { status: "idle", message: "" };
const text = (en: string, fr: string, french: boolean) => french ? fr : en;
const responseLabel = (count: number, french: boolean) => french
  ? count === 1 ? "réponse anonyme" : "réponses anonymes"
  : count === 1 ? "anonymous response" : "anonymous responses";

function annualQuestionLabel(id: string, french: boolean) {
  const defaultQuestion = annualQuestions.find((question) => question.id === id);
  if (defaultQuestion) {
    const match = id.match(/^s(\d+)q(\d+)$/);
    if (french && match) return annualSurveySectionsFr[Number(match[1]) - 1]?.qs[Number(match[2])] ?? defaultQuestion.text;
    return defaultQuestion.text;
  }
  return (french ? ratedBankFr : ratedBank).find((question) => question.id === id)?.text ?? id;
}

function meetingQuestionLabel(id: string, french: boolean) {
  const defaultQuestion = meetingQuestions.find((question) => question.id === id);
  if (defaultQuestion) {
    const match = id.match(/^g(\d+)q(\d+)$/);
    if (french && match) return meetingSurveyGroupsFr[Number(match[1])]?.qs[Number(match[2])] ?? defaultQuestion.text;
    return defaultQuestion.text;
  }
  return french
    ? meetingBankFr.find((question) => question[0] === id)?.[1] ?? id
    : meetingBank.find((question) => question.id === id)?.text ?? id;
}

function assessmentLabel(flag: string | null, trend: string, french: boolean) {
  if (!flag) return french ? "Réponses insuffisantes" : "Insufficient responses";
  const labels: Record<string, [string, string]> = {
    strength: ["Governance strength", "Force de gouvernance"],
    satisfactory: ["Satisfactory", "Satisfaisant"],
    improve: ["Area for improvement", "Point à améliorer"],
    concern: ["Significant concern", "Préoccupation importante"],
  };
  const label = labels[flag];
  const trends: Record<string, [string, string]> = {
    up: ["Improving", "En hausse"], down: ["Declining", "En baisse"],
    stable: ["Stable", "Stable"], new: ["First year", "Première année"],
  };
  return `${label ? label[french ? 1 : 0] : flag}${trend ? ` · ${trends[trend]?.[french ? 1 : 0] ?? trend}` : ""}`;
}

function trendWithChange(change: string, fallback: string) {
  if (!change) return fallback;
  const value = Number(change);
  return value >= 0.3 ? "up" : value <= -0.3 ? "down" : "stable";
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{children}</Button>;
}

function Notice({ state }: { state: EvaluationActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"}
    className={`rounded-lg border p-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{state.message}</p> : null;
}

function NewCycle({ suggestedYear, french }: { suggestedYear: number | null; french: boolean }) {
  const [state, action] = useActionState(openBoardEvaluation, idle);
  if (!suggestedYear) return null;
  return <Card><CardHeader><CardTitle>{text("Start an annual board evaluation", "Commencer une évaluation annuelle du conseil", french)}</CardTitle></CardHeader>
    <CardContent><form action={action} className="space-y-4">
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="evaluation-year">{text("Evaluation year", "Année de l’évaluation", french)}</Label>
          <Input id="evaluation-year" name="year" type="number" min={2000} max={2100} required defaultValue={suggestedYear} />
          <p className="text-xs text-slate-500">{text("One survey per year; choose 2000–2100.", "Un sondage par année; choisissez de 2000 à 2100.", french)}</p></div>
        <div className="space-y-2"><Label htmlFor="evaluation-deadline">{text("Response deadline (optional)", "Date limite des réponses (facultative)", french)}</Label>
          <Input id="evaluation-deadline" name="closesOn" type="date" min={new Date().toISOString().slice(0, 10)} />
          <p className="text-xs text-slate-500">{text("Today or a future date.", "Aujourd’hui ou une date ultérieure.", french)}</p></div>
      </div><Submit>{text("Open evaluation", "Ouvrir l’évaluation", french)}</Submit>
    </form></CardContent></Card>;
}

function SelectionCounter({ count, min, max, label, french }: { count: number; min: number; max: number; label: string; french: boolean }) {
  const status = questionSelectionStatus(count, min, max);
  return <div className={`rounded-lg border p-3 text-sm ${status === "on_target" ? "border-green-200 bg-green-50" : status === "above" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
    <strong>{count} / {min}–{max} {label}</strong><p className="mt-1 text-xs">{status === "on_target" ? text("On target", "Dans la cible", french) : status === "above" ? text("Above the recommended maximum", "Au-dessus du maximum recommandé", french) : text("Below the recommended minimum", "Sous le minimum recommandé", french)}</p>
  </div>;
}

function QuestionBank({ cycle, organizationName, responseCount, french }: { cycle: NonNullable<Data["cycle"]>; organizationName: string; responseCount: number; french: boolean }) {
  const [state, action] = useActionState(saveBoardEvaluationConfiguration, idle);
  const [selection, setSelection] = useState<QuestionSelection>(cycle.questionSelection ?? { rated: [], open: [], meeting: [], meetingOpen: [] });
  const [invited, setInvited] = useState(String(cycle.invitedCount));
  function toggle(group: keyof QuestionSelection, id: string) {
    setSelection((current) => ({ ...current, [group]: current[group].includes(id)
      ? current[group].filter((item) => item !== id)
      : group === "meetingOpen" ? [id] : [...current[group], id] }));
  }
  const editable = cycle.status === "open" && responseCount === 0;
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>{text("Administrator guide & question bank", "Guide de l’administration et banque de questions", french)}</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
        <p>{text("Use this bank to select the questions in your organization’s annual and post-meeting surveys. The default annual survey contains the final 44-question template until you save a custom selection.", "Utilisez cette banque pour choisir les questions des sondages annuels et après réunion de votre organisme. Le sondage annuel comporte les 44 questions du modèle final jusqu’à ce qu’une sélection personnalisée soit enregistrée.", french)}</p>
        {responseCount > 0 ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-900">{text("Question selection is locked after the first response so all results use the same survey.", "La sélection des questions est verrouillée dès la première réponse pour que tous les résultats utilisent le même sondage.", french)}</p> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <SelectionCounter count={selection.rated.length} min={30} max={45} label={text("rated", "notées", french)} french={french} />
          <SelectionCounter count={selection.open.length} min={2} max={4} label={text("open", "ouvertes", french)} french={french} />
          <SelectionCounter count={selection.meeting.length} min={3} max={5} label={text("meeting", "de réunion", french)} french={french} />
        </div>
      </CardContent></Card>
    <BoardEvaluationAdminGuide french={french} organizationName={organizationName} year={cycle.year} token={cycle.publicToken} />
    <form action={action} className="space-y-4 rounded-xl border bg-white p-5">
      <Input name="cycleId" type="hidden" value={cycle.id} readOnly />
      <Input name="selection" type="hidden" value={JSON.stringify(selection)} readOnly />
      <div className="max-w-xs space-y-2"><Label htmlFor="invited-count">{text("Board members invited", "Membres du conseil invités", french)}</Label>
        <Input id="invited-count" name="invitedCount" type="number" min={0} max={10000} step={1} value={invited} onChange={(event) => setInvited(event.target.value)} disabled={!editable} />
        <p className="text-xs text-slate-500">{text("Use the actual number invited to calculate response rate and protect small-board results.", "Indiquez le nombre réel de personnes invitées pour calculer le taux de réponse et protéger les petits conseils.", french)}</p></div>
      <Notice state={state} />
      {editable ? <Submit>{text("Save survey selection", "Enregistrer la sélection", french)}</Submit> : null}
    </form>
    <QuestionBankGroup title={text("Rated questions — annual survey", "Questions notées — sondage annuel", french)} items={(french ? ratedBankFr : ratedBank).map((question) => ({ ...question, detail: question.category }))} selected={selection.rated} disabled={!editable} onToggle={(id) => toggle("rated", id)} />
    <QuestionBankGroup title={text("Open questions — annual survey", "Questions ouvertes — sondage annuel", french)} items={(french ? openBankFr : openBank).map((question) => ({ ...question, detail: "" }))} selected={selection.open} disabled={!editable} onToggle={(id) => toggle("open", id)} />
    <QuestionBankGroup title={text("Meeting evaluation questions", "Questions d’évaluation des réunions", french)} items={meetingBank.map((question) => ({ ...question,
      text: french ? meetingBankFr.find((item) => item[0] === question.id)?.[1] ?? question.text : question.text,
      detail: french ? meetingCategoryFr[question.category] ?? question.category : question.category,
    }))} selected={selection.meeting} disabled={!editable} onToggle={(id) => toggle("meeting", id)} />
    <QuestionBankGroup title={text("Optional meeting comment prompt (choose one)", "Question ouverte facultative après réunion (choisissez-en une)", french)} items={(french ? meetingOpenBankFr : meetingOpenBank).map((question) => ({ ...question, detail: "" }))} selected={selection.meetingOpen} disabled={!editable} onToggle={(id) => toggle("meetingOpen", id)} />
  </div>;
}

function QuestionBankGroup({ title, items, selected, disabled, onToggle }: { title: string; items: Array<{ id: string; text: string; detail: string }>; selected: string[]; disabled: boolean; onToggle: (id: string) => void }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2">
    {items.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox id={`include-${item.id}`} checked={selected.includes(item.id)} disabled={disabled} onChange={() => onToggle(item.id)} />
      <div><Label htmlFor={`include-${item.id}`} className="cursor-pointer leading-6">{item.text}</Label>{item.detail ? <p className="text-xs text-slate-500">{item.detail}</p> : null}</div>
    </div>)}
  </CardContent></Card>;
}

function ShareLink({ href, label, french }: { href: string; label: string; french: boolean }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      setCopied(true); setCopyError("");
    } catch { setCopyError(text("Copy failed. Open the link and copy its address.", "La copie a échoué. Ouvrez le lien et copiez son adresse.", french)); }
  }
  return <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-3">
    <Link2 className="size-4 text-slate-500" aria-hidden="true" />
    <Link href={href} className="min-w-0 flex-1 break-all text-sm font-medium text-olea-green underline">{label}</Link>
    <Button type="button" size="sm" variant="outline" onClick={() => void copy()}><Copy className="size-4" />{copied ? text("Copied", "Copié", french) : text("Copy link", "Copier le lien", french)}</Button>
    {copyError ? <p role="alert" className="w-full text-xs text-red-800">{copyError}</p> : null}
  </div>;
}

function AnnualInvitations({ cycleId, french }: { cycleId: string; french: boolean }) {
  const [state, action] = useActionState(sendAnnualBoardEvaluationInvitations, idle);
  const [emails, setEmails] = useState("");
  const [validation, setValidation] = useState("");
  return <Card><CardHeader><CardTitle>{text("Email the board", "Envoyer le sondage au conseil", french)}</CardTitle></CardHeader>
    <CardContent><form action={action} className="space-y-3" onSubmit={(event) => {
      try { parseBoardEvaluationInviteEmails(emails); setValidation(""); }
      catch (error) {
        event.preventDefault();
        setValidation(error instanceof Error ? error.message : "Check the email addresses.");
      }
    }}>
      <Input type="hidden" name="cycleId" value={cycleId} readOnly />
      <div className="space-y-2"><Label htmlFor="evaluation-invite-emails">{text("Board member email addresses", "Adresses courriel des membres du conseil", french)}</Label>
        <Textarea id="evaluation-invite-emails" name="emails" required maxLength={33000} rows={4}
          value={emails} onChange={(event) => { setEmails(event.target.value); setValidation(""); }}
          placeholder="member1@organization.org\nmember2@organization.org" aria-describedby="evaluation-invite-help" />
        <p id="evaluation-invite-help" className="text-xs text-slate-600">{text("Enter one email per line, comma, or semicolon (up to 100 at a time). Everyone receives the same anonymous link. Repeating an address does not send another invitation.", "Indiquez un courriel par ligne, virgule ou point-virgule (100 à la fois au maximum). Tous reçoivent le même lien anonyme. Une adresse répétée ne reçoit pas un nouvel envoi.", french)}</p></div>
      {validation ? <p role="alert" className="text-sm text-red-800">{validation}</p> : null}
      <Notice state={state} />
      <Submit>{text("Send shared survey link", "Envoyer le lien commun", french)}</Submit>
    </form></CardContent></Card>;
}

function ThankYouEditor({ cycleId, current, french }: { cycleId: string; current: unknown; french: boolean }) {
  const [state, action] = useActionState(saveBoardEvaluationThankYou, idle);
  const [copy, setCopy] = useState(() => boardEvaluationThankYouCopy(current));
  return <Card><CardHeader><CardTitle>{text("Survey confirmation", "Confirmation du sondage", french)}</CardTitle></CardHeader>
    <CardContent><form action={action} className="space-y-3">
      <p className="text-sm text-slate-600">{text("Shown after an anonymous annual response is saved. Provide both languages so each member sees the selected language.", "Affiché après l’enregistrement d’une réponse annuelle anonyme. Rédigez les deux langues pour respecter la langue choisie par chaque membre.", french)}</p>
      <Input type="hidden" name="cycleId" value={cycleId} readOnly /><Input type="hidden" name="copy" value={JSON.stringify(copy)} readOnly />
      {([
        ["enTitle", "English title", "Titre anglais", 160],
        ["frTitle", "French title", "Titre français", 160],
      ] as const).map(([key, en, fr, max]) => <div key={key} className="space-y-1"><Label htmlFor={`thanks-${key}`}>{text(en, fr, french)}</Label>
        <Input id={`thanks-${key}`} required minLength={3} maxLength={max} value={copy[key]}
          onChange={(event) => setCopy((value) => ({ ...value, [key]: event.target.value }))} />
      </div>)}
      {([
        ["enMessage", "English message", "Message anglais"],
        ["frMessage", "French message", "Message français"],
      ] as const).map(([key, en, fr]) => <div key={key} className="space-y-1"><Label htmlFor={`thanks-${key}`}>{text(en, fr, french)}</Label>
        <Textarea id={`thanks-${key}`} required minLength={10} maxLength={1000} value={copy[key]}
          onChange={(event) => setCopy((value) => ({ ...value, [key]: event.target.value }))} />
        <p className="text-xs text-slate-500">{text("10–1,000 characters.", "De 10 à 1 000 caractères.", french)}</p>
      </div>)}
      <Notice state={state} /><Submit>{text("Save confirmation", "Enregistrer la confirmation", french)}</Submit>
    </form></CardContent></Card>;
}

function AnnualSurvey({ data, french }: { data: Data; french: boolean }) {
  const cycle = data.cycle;
  const [state, action] = useActionState(closeBoardEvaluation, idle);
  const [deadlineState, deadlineAction] = useActionState(extendBoardEvaluationDeadline, idle);
  if (!cycle || !data.annual) return null;
  return <div className="space-y-5">
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{cycle.year} {text("annual survey", "sondage annuel", french)}</CardTitle><Badge variant="outline">{cycle.status === "open" ? text("Open", "Ouvert", french) : text("Closed", "Fermé", french)}</Badge></div></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">{text("Share the same anonymous link with every board member. No individual link or account identity is stored with a response.", "Partagez le même lien anonyme avec chaque membre du conseil. Aucun lien individuel ni identifiant de compte n’est conservé avec une réponse.", french)}</p>
        <ShareLink href={`/board-evaluation/annual/${cycle.publicToken}`} label={text("Open annual survey", "Ouvrir le sondage annuel", french)} french={french} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3"><strong className="text-2xl">{data.annual.received}</strong><p className="text-sm text-slate-500">{responseLabel(data.annual.received, french)}</p></div>
          <div className="rounded-lg border p-3"><strong className="text-2xl">{cycle.invitedCount || "—"}</strong><p className="text-sm text-slate-500">{text("members invited", "membres invités", french)}</p></div>
          <div className="rounded-lg border p-3"><strong className="text-2xl">{data.annual.responseRate === null ? "—" : `${data.annual.responseRate}%`}</strong><p className="text-sm text-slate-500">{text("response rate", "taux de réponse", french)}</p></div>
        </div>
        {cycle.closesOn ? <p className="text-sm text-slate-600">{text("Deadline", "Date limite", french)}: {cycle.closesOn}</p> : null}
        {data.legacyResponseCount ? <p className="text-xs text-slate-500">{data.legacyResponseCount} {text("earlier identity-linked responses are archived separately and are not merged into this anonymous survey’s scores.", "anciennes réponses liées à un compte sont archivées séparément et ne sont pas mêlées aux notes de ce sondage anonyme.", french)}</p> : null}
        {data.canManage && cycle.status === "open" ? <form action={deadlineAction} className="flex flex-wrap items-end gap-3 border-t pt-4">
          <Input type="hidden" name="cycleId" value={cycle.id} readOnly />
          <div className="space-y-1"><Label htmlFor={`evaluation-deadline-${cycle.id}`}>{text("Response deadline", "Date limite des réponses", french)}</Label>
            <Input id={`evaluation-deadline-${cycle.id}`} name="closesOn" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={cycle.closesOn ?? ""} required />
            <p className="text-xs text-slate-500">{text("Choose today or a future date.", "Choisissez aujourd’hui ou une date ultérieure.", french)}</p></div>
          <Submit>{text("Update deadline", "Modifier la date limite", french)}</Submit>
          <Notice state={deadlineState} />
        </form> : null}
        {data.canManage && cycle.status === "open" ? <form action={action} className="space-y-3 border-t pt-4">
          <Input type="hidden" name="cycleId" value={cycle.id} readOnly />
          <Notice state={state} />
          <p className="text-xs text-slate-600">{text("Closing stops new responses. Questions with fewer than five ratings stay hidden in the report.", "La fermeture met fin aux réponses. Les questions ayant moins de cinq notes restent masquées dans le rapport.", french)}</p>
          <Submit>{text("Close survey and calculate results", "Fermer le sondage et calculer les résultats", french)}</Submit>
        </form> : null}
      </CardContent></Card>
    {data.canManage && cycle.status === "open" ? <AnnualInvitations cycleId={cycle.id} french={french} /> : null}
    {data.canManage ? <ThankYouEditor cycleId={cycle.id} current={cycle.thankYouCopy} french={french} /> : null}
    {cycle.status === "closed" ? <Card><CardHeader><CardTitle>{text("Aggregate results", "Résultats regroupés", french)}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-slate-600">{text("Questions with fewer than five ratings are suppressed. Small boards see averages only.", "Les questions ayant moins de cinq notes sont masquées. Les petits conseils voient seulement les moyennes.", french)}</p>
      <div className="grid gap-3 md:grid-cols-2">{data.annual.sections.map((section) => <div key={section.number} className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3"><strong>{section.number}. {french ? annualSurveySectionsFr[section.number - 1]?.name ?? section.name : section.name}</strong><Badge variant="outline">{section.average === null ? "—" : section.average.toFixed(2)}</Badge></div>
        <p className="mt-2 text-xs text-slate-600">{assessmentLabel(section.flag, section.trend, french)}{section.persistentConcern ? ` · ${text("Persistent concern", "Préoccupation persistante", french)}` : ""}</p>
      </div>)}</div>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{text("Question detail", "Détail des questions", french)}</summary><div className="mt-4 space-y-2">
        {data.annual.questions.map((item) => <div key={item.id} className="space-y-1 border-b py-2 text-sm"><div className="flex items-start justify-between gap-3"><span>{item.id} · {annualQuestionLabel(item.id, french)}</span><Badge variant="outline">{item.average === null ? "—" : `${item.average.toFixed(2)} / 5`}</Badge></div>
          {item.average !== null && !data.annual.smallBoard ? <p className="text-xs text-slate-600">{item.count} {text("ratings", "notes", french)} · {item.percentPositive}% {text("rated 4 or 5", "ont donné 4 ou 5", french)} · {text("Distribution 1–5", "Répartition 1–5", french)}: {item.distribution?.join(" / ")}</p> : null}
        </div>)}
      </div></details>
    </CardContent></Card> : null}
  </div>;
}

function MeetingEvaluations({ data, french }: { data: Data; french: boolean }) {
  const [createState, createAction] = useActionState(createPostMeetingEvaluation, idle);
  const [selectedMeeting, setSelectedMeeting] = useState("");
  const available = data.calendarMeetings.filter((meeting) => !data.meetingSurveys.some((survey) =>
    survey.meetingId === meeting.meetingId && survey.templateInstanceId === meeting.templateInstanceId));
  const chosen = available.find((meeting) => `${meeting.templateInstanceId}:${meeting.meetingId}` === selectedMeeting);
  return <div className="space-y-5">
    {data.canManage ? <Card><CardHeader><CardTitle>{text("Create a post-meeting evaluation", "Créer une évaluation après réunion", french)}</CardTitle></CardHeader><CardContent>
      <form action={createAction} className="space-y-4">
        <Notice state={createState} />
        <Input type="hidden" name="templateInstanceId" value={chosen?.templateInstanceId ?? ""} readOnly />
        <Input type="hidden" name="meetingId" value={chosen?.meetingId ?? ""} readOnly />
        <div className="max-w-xl space-y-2"><Label htmlFor="meeting-survey-source">{text("Board Calendar meeting", "Réunion du calendrier du conseil", french)}</Label>
          <Select value={selectedMeeting || undefined} onValueChange={setSelectedMeeting}><SelectTrigger id="meeting-survey-source"><SelectValue placeholder={text("Choose a meeting", "Choisir une réunion", french)} /></SelectTrigger><SelectContent>
            {available.map((meeting) => <SelectItem key={`${meeting.templateInstanceId}:${meeting.meetingId}`} value={`${meeting.templateInstanceId}:${meeting.meetingId}`}>{meeting.date} · {meeting.title}</SelectItem>)}
          </SelectContent></Select>
          <p className="text-xs text-slate-500">{text("Each meeting gets one shared anonymous link and QR code.", "Chaque réunion reçoit un lien anonyme commun et un code QR.", french)}</p>
        </div>
        {available.length ? <Submit><Plus className="size-4" />{text("Create link", "Créer le lien", french)}</Submit> : <p className="text-sm text-slate-500">{text("Add a dated meeting in Board Calendar first.", "Ajoutez d’abord une réunion datée dans le calendrier du conseil.", french)}</p>}
      </form>
    </CardContent></Card> : null}
    {data.meetingSurveys.map((survey) => <MeetingSurveyCard key={survey.id} survey={survey} french={french} canManage={data.canManage} />)}
    {!data.meetingSurveys.length ? <Card><CardContent className="p-6 text-sm text-slate-500">{text("No post-meeting evaluations yet.", "Aucune évaluation après réunion pour le moment.", french)}</CardContent></Card> : null}
  </div>;
}

function MeetingInvitations({ surveyId, french }: { surveyId: string; french: boolean }) {
  const [state, action] = useActionState(sendMeetingBoardEvaluationInvitations, idle);
  const [emails, setEmails] = useState("");
  const [validation, setValidation] = useState("");
  return <form action={action} className="space-y-2 rounded-lg border bg-slate-50 p-4" onSubmit={(event) => {
    try { parseBoardEvaluationInviteEmails(emails); setValidation(""); }
    catch (error) { event.preventDefault(); setValidation(error instanceof Error ? error.message : "Check the email addresses."); }
  }}>
    <Input type="hidden" name="surveyId" value={surveyId} readOnly />
    <Label htmlFor={`meeting-invite-${surveyId}`}>{text("Email this meeting survey to the board", "Envoyer ce sondage au conseil", french)}</Label>
    <Textarea id={`meeting-invite-${surveyId}`} name="emails" required maxLength={33000} rows={3} value={emails}
      onChange={(event) => { setEmails(event.target.value); setValidation(""); }}
      placeholder="member1@organization.org\nmember2@organization.org" aria-describedby={`meeting-invite-help-${surveyId}`} />
    <p id={`meeting-invite-help-${surveyId}`} className="text-xs text-slate-600">{text("One address per line, comma, or semicolon; up to 100. All recipients get the same anonymous link.", "Une adresse par ligne, virgule ou point-virgule; 100 au maximum. Tous reçoivent le même lien anonyme.", french)}</p>
    {validation ? <p role="alert" className="text-sm text-red-800">{validation}</p> : null}
    <Notice state={state} />
    <Submit>{text("Send meeting link", "Envoyer le lien de réunion", french)}</Submit>
  </form>;
}

function MeetingSurveyCard({ survey, french, canManage }: { survey: Data["meetingSurveys"][number]; french: boolean; canManage: boolean }) {
  const [closeState, closeAction] = useActionState(closePostMeetingEvaluation, idle);
  const [copiedAgenda, setCopiedAgenda] = useState(false);
  const [copyError, setCopyError] = useState("");
  const href = `/board-evaluation/meeting/${survey.token}`;
  async function copyAgenda() {
    const url = new URL(href, window.location.origin);
    try {
      await navigator.clipboard.writeText(text(
        `Meeting check-in (2 min): Please complete tonight’s anonymous post-meeting evaluation before you leave — ${url} or scan the QR code.`,
        `Retour sur la réunion (2 min) : veuillez remplir l’évaluation anonyme après la réunion avant de partir — ${url} ou balayez le code QR.`, french));
      setCopiedAgenda(true); setCopyError("");
    } catch { setCopyError(text("Could not copy the agenda text.", "Impossible de copier le texte de l’ordre du jour.", french)); }
  }
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{survey.date} · {survey.title}</CardTitle><Badge variant="outline">{survey.status === "open" ? text("Open", "Ouverte", french) : text("Closed", "Fermée", french)}</Badge></div></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-slate-600">{survey.responseCount} {responseLabel(survey.responseCount, french)}</p>
    <ShareLink href={href} label={text("Open meeting evaluation", "Ouvrir l’évaluation de la réunion", french)} french={french} />
    <MeetingSurveyQr href={href} french={french} />
    {canManage && survey.status === "open" ? <MeetingInvitations surveyId={survey.id} french={french} /> : null}
    {canManage ? <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void copyAgenda()}><Copy className="size-4" />{copiedAgenda ? text("Copied", "Copié", french) : text("Copy agenda text", "Copier le texte pour l’ordre du jour", french)}</Button>
      {survey.status === "open" ? <form action={closeAction}><Input type="hidden" name="surveyId" value={survey.id} readOnly /><Submit>{text("Close evaluation", "Fermer l’évaluation", french)}</Submit></form> : null}</div> : null}
    <Notice state={closeState} />
    {copyError ? <p role="alert" className="text-sm text-red-800">{copyError}</p> : null}
    {survey.status === "closed" ? <div className="grid gap-2 sm:grid-cols-2">{survey.results.map((result) => <div key={result.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{meetingQuestionLabel(result.id, french)}</span><Badge variant="outline">{result.average === null ? "—" : result.average.toFixed(2)}</Badge></div>)}</div> : null}
    {canManage && survey.status === "closed" ? <BoardEvaluationMeetingComments comments={survey.comments} surveyId={survey.id} french={french} /> : null}
  </CardContent></Card>;
}

function MeetingSurveyQr({ href, french }: { href: string; french: boolean }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = new URL(href, window.location.origin).toString();
    void import("qrcode").then((qr) => qr.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 176 }))
      .then(setSrc).catch(() => setSrc(""));
  }, [href]);
  if (!src) return null;
  return <div className="inline-block rounded-lg border bg-white p-3 text-center">
    <img src={src} width={176} height={176} alt={text("QR code for the anonymous meeting evaluation link", "Code QR du lien d’évaluation anonyme après réunion", french)} />
    <p className="mt-1 text-xs text-slate-500">{text("Scan at the meeting", "Balayer pendant la réunion", french)}</p>
  </div>;
}

type YearRow = { year: string; overall: string; strength: string; priority: string; responseRate: string };

function OpenAnswerReview({ answer, cycleId, french }: { answer: Data["openAnswers"][number]; cycleId: string; french: boolean }) {
  const [state, action] = useActionState(reviewBoardEvaluationOpenAnswer, idle);
  const [redacted, setRedacted] = useState(answer.redactedBody || "");
  const [approved, setApproved] = useState(answer.approved);
  return <form action={action} className="space-y-3 rounded-lg border p-4">
    <Input type="hidden" name="cycleId" value={cycleId} readOnly />
    <Input type="hidden" name="answerId" value={answer.id} readOnly />
    <Input type="hidden" name="redacted" value={redacted} readOnly />
    <Input type="hidden" name="approved" value={String(approved)} readOnly />
    <p className="text-xs font-semibold uppercase text-slate-500">{text("Open question", "Question ouverte", french)} {answer.questionId}</p>
    <p className="whitespace-pre-wrap text-sm text-slate-800">{answer.body}</p>
    <div className="space-y-2"><Label htmlFor={`redacted-${answer.id}`}>{text("Safe paraphrase for theme analysis", "Reformulation sûre pour l’analyse des thèmes", french)}</Label>
      <Textarea id={`redacted-${answer.id}`} maxLength={4000} value={redacted} onChange={(event) => setRedacted(event.target.value)} placeholder={text("Remove names and identifying details", "Retirez les noms et les détails identifiables", french)} />
    </div>
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={approved} onChange={(event) => setApproved(event.target.checked)} />{text("Reviewed and safe to use when writing themes", "Examinée et sûre à utiliser pour rédiger les thèmes", french)}</label>
    <Notice state={state} />
    <Submit>{text("Save review", "Enregistrer la révision", french)}</Submit>
  </form>;
}

function SummaryAndActionPlan({ data, french }: { data: Data; french: boolean }) {
  const cycle = data.cycle;
  const [state, action] = useActionState(saveBoardEvaluationSummary, idle);
  const savedReport = readBoardEvaluationSummary(cycle?.summaryReport, {
    openedOn: cycle?.openedOn, closedOn: cycle?.closedOn,
  });
  const [preparedBy, setPreparedBy] = useState(savedReport.preparedBy);
  const [openedOn, setOpenedOn] = useState(savedReport.openedOn);
  const [closedOn, setClosedOn] = useState(savedReport.closedOn);
  const [changeVsPrior, setChangeVsPrior] = useState(savedReport.changeVsPrior);
  const [themeDetails, setThemeDetails] = useState(savedReport.themeDetails);
  const [priorities, setPriorities] = useState<SummaryPriority[]>(savedReport.priorities);
  const [strengths, setStrengths] = useState(savedReport.strengths);
  const [concerns, setConcerns] = useState(savedReport.concerns);
  const [monitor, setMonitor] = useState(savedReport.monitor);
  const [discussionQuestions, setDiscussionQuestions] = useState(savedReport.discussionQuestions);
  const [yearRecord, setYearRecord] = useState<YearRow[]>(savedReport.yearRecord);
  const [notes, setNotes] = useState(savedReport.notes);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const handledAction = useRef(state);
  const reportValue = {
    ...savedReport, preparedBy, openedOn, closedOn, changeVsPrior, themeDetails,
    themes: themeDetails.map((rows) => rows[0].pattern), priorities,
    strengths, concerns, monitor, discussionQuestions, yearRecord, notes,
  };
  const reportSnapshot = JSON.stringify(reportValue);
  const [savedSnapshot, setSavedSnapshot] = useState(reportSnapshot);
  const hasUnsavedReport = reportSnapshot !== savedSnapshot;
  useEffect(() => {
    if (handledAction.current === state) return;
    handledAction.current = state;
    if (state.status === "success") setSavedSnapshot(reportSnapshot);
  }, [reportSnapshot, state]);
  if (!cycle || !data.annual) return null;
  function updatePriority(index: number, key: Exclude<keyof SummaryPriority, "responsible">, value: string) {
    setPriorities((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }
  function updateResponsible(index: number, key: keyof SummaryPriority["responsible"], value: boolean | string) {
    setPriorities((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, responsible: { ...item.responsible, [key]: value } } : item));
  }
  function updateTheme(question: number, theme: number, key: "pattern" | "frequency", value: string) {
    setThemeDetails((current) => current.map((rows, questionIndex) => questionIndex === question
      ? rows.map((row, themeIndex) => themeIndex === theme ? { ...row, [key]: value } : row) : rows));
  }
  function updateYearRow(index: number, key: keyof YearRow, value: string) {
    setYearRecord((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }
  async function exportPdf() {
    setExporting(true);
    setExportError("");
    const result = await generateBoardEvaluationReportPdf(cycle!.id, french);
    setExporting(false);
    if (!result.ok) { setExportError(result.error); return; }
    const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes.buffer], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = result.fileName; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return <div className="space-y-5">
    {cycle.status === "closed" ? <BoardEvaluationExistingActions cycleId={cycle.id} items={data.actions} french={french} /> : null}
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{text("Summary of results & action plan", "Résumé des résultats et plan d’action", french)}</CardTitle><Badge variant="outline">{text("Administrator use only", "Réservé à l’administration", french)}</Badge></div></CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p>{text("Use aggregate scores and reviewed themes to prepare the board-facing findings report. Do not include names or identifiable quotes.", "Utilisez les notes regroupées et les thèmes examinés pour préparer le rapport au conseil. N’incluez ni noms ni citations identifiables.", french)}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3"><strong className="text-xl">{cycle.invitedCount || "—"}</strong><p>{text("Invited", "Invités", french)}</p></div>
          <div className="rounded-lg border p-3"><strong className="text-xl">{data.annual.received}</strong><p>{text("Responses", "Réponses", french)}</p></div>
          <div className="rounded-lg border p-3"><strong className="text-xl">{data.annual.responseRate === null ? "—" : `${data.annual.responseRate}%`}</strong><p>{text("Response rate", "Taux de réponse", french)}</p></div>
        </div>
      </CardContent></Card>
    <form action={action} className="space-y-5">
      <Input name="cycleId" type="hidden" value={cycle.id} readOnly />
      <Input name="report" type="hidden" value={JSON.stringify(reportValue)} readOnly />
      <Card><CardHeader><CardTitle>{text("Survey details", "Détails du sondage", french)}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1"><Label htmlFor="summary-board-year">{text("Board year", "Année du conseil", french)}</Label><Input id="summary-board-year" value={String(cycle.year)} readOnly /><p className="text-xs text-slate-500">{text("Set when the evaluation opens.", "Définie à l’ouverture de l’évaluation.", french)}</p></div>
        <div className="space-y-1"><Label htmlFor="summary-prepared-by">{text("Prepared by", "Préparé par", french)}</Label><Input id="summary-prepared-by" maxLength={160} value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} placeholder={text("Name or role", "Nom ou fonction", french)} /></div>
        <div className="space-y-1"><Label htmlFor="summary-opened-on">{text("Survey open", "Ouverture du sondage", french)}</Label><Input id="summary-opened-on" type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="summary-closed-on">{text("Survey closed", "Clôture du sondage", french)}</Label><Input id="summary-closed-on" type="date" min={openedOn || undefined} value={closedOn} onChange={(event) => setClosedOn(event.target.value)} /><p className="text-xs text-slate-500">{text("On or after the opening date.", "À la date d’ouverture ou après.", french)}</p></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text("Quantitative results", "Résultats quantitatifs", french)}</CardTitle></CardHeader><CardContent className="space-y-2">
        <p className="text-xs text-slate-600">{text("Counts, averages, and the share of ratings 4–5 are calculated from responses; small samples are suppressed. Enter the change versus the prior year from -5 to +5, with up to two decimals, when known.", "Le nombre, la moyenne et la part des notes 4–5 sont calculés à partir des réponses; les petits échantillons sont masqués. Indiquez la variation par rapport à l’année précédente de -5 à +5, avec au plus deux décimales, si elle est connue.", french)}</p>
        {data.annual.sections.map((section) => <div key={section.number} className="grid gap-2 rounded-lg border p-3 text-sm lg:grid-cols-[minmax(0,1fr)_5rem_6rem_5rem_6rem_auto] lg:items-center">
          <strong>{section.number}. {french ? annualSurveySectionsFr[section.number - 1]?.name ?? section.name : section.name}</strong>
          <div className="space-y-1"><Label htmlFor={`score-count-${section.number}`} className="text-xs">{text("# Resp", "Nb rép.", french)}</Label><Input id={`score-count-${section.number}`} value={cycle.status === "closed" ? String(section.responseCount) : ""} placeholder="—" readOnly /></div>
          <div className="space-y-1"><Label htmlFor={`score-current-${section.number}`} className="text-xs">{text("Current avg", "Moy. actuelle", french)}</Label><Input id={`score-current-${section.number}`} value={section.average === null ? "" : section.average.toFixed(2)} placeholder="—" readOnly aria-describedby="summary-score-guidance" /></div>
          <div className="space-y-1"><Label htmlFor={`score-positive-${section.number}`} className="text-xs">% 4–5</Label><Input id={`score-positive-${section.number}`} value={section.percentPositive === null ? "" : `${section.percentPositive}%`} placeholder="—" readOnly /></div>
          <div className="space-y-1"><Label htmlFor={`score-change-${section.number}`} className="text-xs">{text("vs Prior", "vs antérieur", french)}</Label><Input id={`score-change-${section.number}`} type="number" min={-5} max={5} step="0.01" value={changeVsPrior[section.number - 1]} onChange={(event) => setChangeVsPrior((current) => current.map((score, index) => index === section.number - 1 ? event.target.value : score))} placeholder="+0.30" /></div>
          <Badge variant="outline">{assessmentLabel(section.flag, trendWithChange(changeVsPrior[section.number - 1], section.trend), french)}{section.persistentConcern ? ` · ${text("Persistent concern", "Préoccupation persistante", french)}` : ""}</Badge>
        </div>)}
        <div className="grid gap-2 rounded-lg border-2 p-3 font-semibold lg:grid-cols-[minmax(0,1fr)_5rem_6rem_5rem_6rem_auto] lg:items-center"><span>{text("Overall", "Ensemble", french)}</span>
          <div className="space-y-1"><Label htmlFor="score-count-overall" className="text-xs">{text("# Resp", "Nb rép.", french)}</Label><Input id="score-count-overall" value={String(data.annual.received)} readOnly /></div>
          <div className="space-y-1"><Label htmlFor="score-current-overall" className="text-xs">{text("Current avg", "Moy. actuelle", french)}</Label><Input id="score-current-overall" value={data.annual.overallAverage === null ? "" : data.annual.overallAverage.toFixed(2)} placeholder="—" readOnly /></div>
          <div className="space-y-1"><Label htmlFor="score-positive-overall" className="text-xs">% 4–5</Label><Input id="score-positive-overall" value={data.annual.overallPositivePercent === null ? "" : `${data.annual.overallPositivePercent}%`} placeholder="—" readOnly /></div>
          <div className="space-y-1"><Label htmlFor="score-change-overall" className="text-xs">{text("vs Prior", "vs antérieur", french)}</Label><Input id="score-change-overall" type="number" min={-5} max={5} step="0.01" value={changeVsPrior[10]} onChange={(event) => setChangeVsPrior((current) => current.map((score, index) => index === 10 ? event.target.value : score))} placeholder="+0.30" /></div><Badge variant="outline">{assessmentLabel(data.annual.overallAverage === null ? null : scoreFlag(data.annual.overallAverage), trendWithChange(changeVsPrior[10], "new"), french)}</Badge>
        </div>
        <p id="summary-score-guidance" className="sr-only">{text("Current averages are calculated and cannot be edited to protect small groups.", "Les moyennes actuelles sont calculées et ne peuvent être modifiées afin de protéger les petits groupes.", french)}</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text("Key findings", "Principaux constats", french)}</CardTitle></CardHeader><CardContent className="grid gap-5 lg:grid-cols-3">
        {([
          ["Top strengths", "Principales forces", strengths, setStrengths],
          ["Priority areas", "Domaines prioritaires", concerns, setConcerns],
          ["Areas to monitor", "Domaines à surveiller", monitor, setMonitor],
        ] as const).map(([en, fr, values, setValues]) => <div key={en} className="space-y-3"><h3 className="font-semibold">{text(en, fr, french)}</h3>
          {values.map((value, index) => <div key={index} className="space-y-1"><Label htmlFor={`${en}-${index}`}>{text(en, fr, french)} {index + 1}</Label>
            <Input id={`${en}-${index}`} maxLength={500} value={value} onChange={(event) => setValues((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={text("Section and key observation", "Domaine et constat principal", french)} /></div>)}
        </div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text("Open-ended response themes", "Thèmes des réponses ouvertes", french)}</CardTitle></CardHeader><CardContent className="space-y-4">
        {data.openAnswers.length ? <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{text("Review anonymous open answers", "Examiner les réponses ouvertes anonymes", french)} ({data.openAnswers.length})</summary>
          <p className="mt-3 text-sm text-slate-600">{text("Only survey administrators can see these unlinked comments. Paraphrase identifying detail before using a theme in the report. Individual ratings are never shown here.", "Seuls les administrateurs du sondage peuvent voir ces commentaires non liés. Reformulez les détails identifiables avant d’utiliser un thème dans le rapport. Les notes individuelles ne sont jamais affichées ici.", french)}</p>
          <div className="mt-4 space-y-3">{data.openAnswers.map((answer) => <OpenAnswerReview key={answer.id} answer={answer} cycleId={cycle.id} french={french} />)}</div>
        </details> : null}
        {themeDetails.map((rows, question) => <div key={question} className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Q{question + 1} — {french ? annualOpenQuestionsFr[question] : annualOpenQuestions[question]}</h3>
          {rows.map((row, theme) => <div key={theme} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div className="space-y-1"><Label htmlFor={`theme-${question}-${theme}`}>{text("Theme", "Thème", french)} {theme + 1} — {text("Pattern", "Tendance", french)}</Label><Input id={`theme-${question}-${theme}`} maxLength={1500} value={row.pattern} onChange={(event) => updateTheme(question, theme, "pattern", event.target.value)} placeholder={text("An anonymous pattern, without names", "Une tendance anonyme, sans noms", french)} /></div>
            <div className="space-y-1"><Label htmlFor={`frequency-${question}-${theme}`}>{text("Frequency", "Fréquence", french)}</Label><Input id={`frequency-${question}-${theme}`} maxLength={50} pattern="[0-9]{1,5} (of|sur) [0-9]{1,5}" title={text("Use a count such as 2 of 6.", "Utilisez un nombre comme 2 sur 6.", french)} value={row.frequency} onChange={(event) => updateTheme(question, theme, "frequency", event.target.value)} placeholder={text("2 of 6", "2 sur 6", french)} /></div>
          </div>)}
          <p className="text-xs text-slate-500">{text("Summarize reviewed answers only. Do not include names or identifying details. Write frequency as x of y when known.", "Résumez seulement les réponses examinées, sans noms ni détails identifiants. Indiquez la fréquence sous la forme x sur y si elle est connue.", french)}</p>
        </div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text("Action planning — three priorities", "Plan d’action — trois priorités", french)}</CardTitle></CardHeader><CardContent className="space-y-5">
        {priorities.map((priority, index) => <div key={index} className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">{text("Priority", "Priorité", french)} {index + 1}</h3>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]"><div className="space-y-1"><Label htmlFor={`priority-section-${index}`}>{text("Section", "Section", french)}</Label><Input id={`priority-section-${index}`} maxLength={160} value={priority.section} onChange={(event) => updatePriority(index, "section", event.target.value)} placeholder={text("Governance area", "Domaine de gouvernance", french)} /></div>
            <div className="space-y-1"><Label htmlFor={`priority-average-${index}`}>{text("Avg", "Moyenne", french)}</Label><Input id={`priority-average-${index}`} type="number" min={0} max={5} step="0.01" value={priority.average} onChange={(event) => updatePriority(index, "average", event.target.value)} placeholder="0–5" /></div></div>
          <div className="space-y-1"><Label htmlFor={`priority-issue-${index}`}>{text("Issue identified", "Problème identifié", french)}</Label><Textarea id={`priority-issue-${index}`} maxLength={1000} value={priority.issue} onChange={(event) => updatePriority(index, "issue", event.target.value)} placeholder={text("What the results show", "Ce que montrent les résultats", french)} /></div>
          <div className="space-y-1"><Label htmlFor={`priority-actions-${index}`}>{text("Suggested actions", "Mesures proposées", french)}</Label><Textarea id={`priority-actions-${index}`} maxLength={1000} value={priority.suggestedActions} onChange={(event) => updatePriority(index, "suggestedActions", event.target.value)} placeholder={text("Specific next steps", "Prochaines étapes précises", french)} /></div>
          <fieldset className="space-y-2"><legend className="text-sm font-medium">{text("Responsible", "Responsable", french)}</legend><div className="flex flex-wrap gap-4">
            {([["boardChair", "Board Chair", "Présidence du conseil"], ["governanceCommittee", "Governance Committee", "Comité de gouvernance"], ["ed", "ED", "DG"], ["other", "Other", "Autre"]] as const).map(([key, en, fr]) => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox checked={priority.responsible[key]} onChange={(event) => updateResponsible(index, key, event.target.checked)} />{text(en, fr, french)}</label>)}
          </div><div className="max-w-sm space-y-1"><Label htmlFor={`priority-other-${index}`}>{text("Other responsible person or group", "Autre personne ou groupe responsable", french)}</Label><Input id={`priority-other-${index}`} maxLength={160} value={priority.responsible.otherName} onChange={(event) => { updateResponsible(index, "otherName", event.target.value); if (event.target.value) updateResponsible(index, "other", true); }} placeholder={text("Name or role", "Nom ou fonction", french)} /></div></fieldset>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor={`priority-due-${index}`}>{text("Target date", "Date cible", french)}</Label><Input id={`priority-due-${index}`} type="date" value={priority.dueOn} onChange={(event) => updatePriority(index, "dueOn", event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor={`priority-checkin-${index}`}>{text("6-month check-in", "Suivi à six mois", french)}</Label><Input id={`priority-checkin-${index}`} type="date" value={priority.checkInOn} onChange={(event) => updatePriority(index, "checkInOn", event.target.value)} /></div></div>
          <div className="space-y-1"><Label htmlFor={`priority-measure-${index}`}>{text("Success looks like", "La réussite ressemblera à", french)}</Label><Textarea id={`priority-measure-${index}`} maxLength={500} value={priority.measure} onChange={(event) => updatePriority(index, "measure", event.target.value)} placeholder={text("A measurable result", "Un résultat mesurable", french)} /></div>
        </div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text("Recommended discussion questions", "Questions de discussion recommandées", french)}</CardTitle></CardHeader><CardContent className="space-y-3">
        {discussionQuestions.map((question, index) => <div key={index} className="space-y-1"><Label htmlFor={`discussion-${index}`}>{text("Question", "Question", french)} {index + 1}</Label><Input id={`discussion-${index}`} maxLength={500} value={question} onChange={(event) => setDiscussionQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text("Year-over-year record", "Suivi d’une année à l’autre", french)}</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-sm text-slate-600">{text("The trend beside each section compares this year’s average with the previous year: a change of at least 0.3 points is flagged.", "La tendance de chaque section compare sa moyenne à celle de l’année précédente : une variation d’au moins 0,3 point est signalée.", french)}</p>
        {yearRecord.map((row, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
          {([
            ["year", "Board year", "Année du conseil", 20],
            ["overall", "Overall average", "Moyenne générale", 20],
            ["strength", "Top strength", "Principale force", 300],
            ["priority", "Improvement priority", "Priorité d’amélioration", 300],
            ["responseRate", "Response rate", "Taux de réponse", 20],
          ] as const).map(([key, en, fr, max]) => <div key={key} className="space-y-1"><Label htmlFor={`year-${index}-${key}`}>{text(en, fr, french)}</Label>
            <Input id={`year-${index}-${key}`} maxLength={max} value={row[key]} onChange={(event) => updateYearRow(index, key, event.target.value)} placeholder={key === "year" ? "2026" : undefined} /></div>)}
        </div>)}
        <Label htmlFor="summary-notes">{text("Discussion and follow-through notes", "Notes de discussion et de suivi", french)}</Label>
        <Textarea id="summary-notes" maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </CardContent></Card>
      <Notice state={state} />
      {exportError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{exportError}</p> : null}
      {hasUnsavedReport ? <p className="text-sm text-amber-800">{text("Save the summary before exporting so the PDF includes your latest edits.", "Enregistrez le résumé avant l’exportation pour inclure vos dernières modifications dans le PDF.", french)}</p> : null}
      <div className="flex flex-wrap gap-2"><Submit>{text("Save summary", "Enregistrer le résumé", french)}</Submit>
        <Button type="button" variant="outline" disabled={exporting || hasUnsavedReport || cycle.status !== "closed"} onClick={() => void exportPdf()}><FileDown className="size-4" />{exporting ? text("Generating...", "Création...", french) : text("Download branded PDF", "Télécharger le PDF à l’image de marque", french)}</Button></div>
    </form>
  </div>;
}

export function BoardEvaluationPrototypeWorkspace({ data }: { data: Data }) {
  const french = useLocaleContext().locale === "fr-CA";
  const cycle = data.cycle;
  const suggestedYear = nextAvailableEvaluationYear(data.cycles.map((item) => item.year), new Date().getUTCFullYear());
  if (!data.hasAccess) return <div className="space-y-5"><PageHeader title={text("Board Evaluation", "Évaluation du conseil", french)} description={text("Assess board practice and turn findings into improvements.", "Évaluez les pratiques du conseil et transformez les constats en améliorations.", french)} />
    <Card><CardContent className="space-y-4 p-6"><ClipboardCheck className="size-8 text-olea-green" /><p>{text("Board Evaluation requires an active eligible membership.", "L’évaluation du conseil exige un abonnement admissible actif.", french)}</p><Button asChild><Link href="/subscription">{text("View membership", "Voir l’abonnement", french)}</Link></Button></CardContent></Card></div>;
  return <div className="space-y-6" data-testid="board-evaluation-prototype-workspace">
    <PageHeader title={text("Board Evaluation", "Évaluation du conseil", french)} description={text("Anonymous annual and post-meeting surveys, question selection, and board action planning.", "Sondages anonymes annuels et après réunion, sélection de questions et plan d’action du conseil.", french)} />
    {data.canManage && !data.cycles.some((item) => item.status === "open") ? <NewCycle suggestedYear={suggestedYear} french={french} /> : null}
    {data.cycles.length > 1 ? <div className="flex flex-wrap gap-2" aria-label={text("Evaluation years", "Années d’évaluation", french)}>{data.cycles.map((item) => <Button key={item.id} asChild size="sm" variant={item.id === cycle?.id ? "default" : "outline"}><Link href={`/modules/board-evaluation?cycle=${item.id}`}>{item.year}</Link></Button>)}</div> : null}
    {!cycle ? <Card><CardContent className="p-6 text-sm text-slate-600">{text("Start an annual evaluation to configure and share the survey. Post-meeting evaluations can be created from Board Calendar meetings.", "Commencez une évaluation annuelle pour configurer et partager le sondage. Les évaluations après réunion peuvent être créées à partir du calendrier du conseil.", french)}</CardContent></Card> : null}
    <Tabs defaultValue="annual" className="space-y-4"><TabsList className="h-auto flex-wrap justify-start gap-1">
      <TabsTrigger value="annual">{text("Annual survey", "Sondage annuel", french)}</TabsTrigger>
      <TabsTrigger value="meetings">{text("Meeting evaluations", "Évaluations des réunions", french)}</TabsTrigger>
      {data.canManage ? <TabsTrigger value="questions">{text("Guide & question bank", "Guide et banque de questions", french)}</TabsTrigger> : null}
      {data.canManage && cycle ? <TabsTrigger value="summary">{text("Summary & action plan", "Résumé et plan d’action", french)}</TabsTrigger> : null}
    </TabsList>
      <TabsContent value="annual" className="space-y-4">{cycle ? <AnnualSurvey data={data} french={french} /> : null}</TabsContent>
      <TabsContent value="meetings"><MeetingEvaluations data={data} french={french} /></TabsContent>
      {data.canManage && cycle ? <TabsContent value="questions"><QuestionBank key={cycle.id} cycle={cycle} organizationName={data.organizationName} responseCount={data.annual?.received ?? 0} french={french} /></TabsContent> : null}
      {data.canManage && cycle ? <TabsContent value="summary"><SummaryAndActionPlan key={cycle.id} data={data} french={french} /></TabsContent> : null}
    </Tabs>
  </div>;
}
