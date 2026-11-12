"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, RotateCcw } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { annualOpenQuestions, annualSurveySections, meetingSurveyGroups } from "@/lib/board-evaluation/prototype-content";
import { annualOpenQuestionsFr, annualSurveySectionsFr, meetingSurveyGroupsFr } from "@/lib/board-evaluation/prototype-content-fr";
import { meetingBankFr, meetingCategoryFr, meetingOpenBankFr, openBankFr, ratedBankFr } from "@/lib/board-evaluation/question-bank-fr";
import { meetingBank, meetingOpenBank, openBank, ratedBank } from "@/lib/board-evaluation/question-bank";
import type { getPublicBoardEvaluationSurvey } from "@/lib/board-evaluation/public-survey";
import { boardEvaluationThankYouCopy } from "@/lib/board-evaluation/thank-you";

type Survey = NonNullable<Awaited<ReturnType<typeof getPublicBoardEvaluationSurvey>>>;
type Answer = 1 | 2 | 3 | 4 | 5 | "na";

const words = {
  en: {
    annual: "Annual Board Self-Evaluation Survey", meeting: "Post-Meeting Evaluation",
    anonymous: "Your response is anonymous. Individual ratings are never shown to the board or staff.",
    scaleAnnual: "1 = Strongly disagree · 3 = Neutral · 5 = Strongly agree · N/A = Not applicable",
    scaleMeeting: "1 = Poor / Not at all · 3 = Satisfactory · 5 = Excellent / Very much so",
    progress: "rated questions answered", openQuestions: "Open-Ended Questions", optionalComment: "Optional Comment",
    incomplete: "Some ratings are blank. You can still submit; blank items are excluded from scoring. Your draft is saved on this device.",
    submit: "Submit anonymously", submitting: "Submitting...", closed: "This survey is closed.",
    error: "Your response could not be saved. Your draft is still here; please try again.",
    thanks: "Thank you — your response is in.",
    thanksBody: "Your input helps the board improve. Only anonymized, aggregated findings will be shared.",
    newResponse: "Start a new response", remaining: "remaining", maxChars: "Up to 4,000 characters; optional.",
  },
  fr: {
    annual: "Sondage annuel d’autoévaluation du conseil", meeting: "Évaluation après la réunion",
    anonymous: "Votre réponse est anonyme. Les notes individuelles ne sont jamais montrées au conseil ni au personnel.",
    scaleAnnual: "1 = Tout à fait en désaccord · 3 = Neutre · 5 = Tout à fait d’accord · S/O = Sans objet",
    scaleMeeting: "1 = Faible / Pas du tout · 3 = Satisfaisant · 5 = Excellent / Tout à fait",
    progress: "questions notées répondues", openQuestions: "Questions ouvertes", optionalComment: "Commentaire facultatif",
    incomplete: "Certaines notes sont vides. Vous pouvez quand même envoyer; elles seront exclues du calcul. Votre brouillon est enregistré sur cet appareil.",
    submit: "Envoyer anonymement", submitting: "Envoi...", closed: "Ce sondage est terminé.",
    error: "Votre réponse n’a pas pu être enregistrée. Votre brouillon est conservé; veuillez réessayer.",
    thanks: "Merci — votre réponse a été reçue.",
    thanksBody: "Votre contribution aide le conseil à s’améliorer. Seuls les résultats regroupés et anonymisés seront partagés.",
    newResponse: "Commencer une nouvelle réponse", remaining: "restantes", maxChars: "Jusqu’à 4 000 caractères; facultatif.",
  },
};

export function AnonymousEvaluationForm({ survey }: { survey: Survey }) {
  const isFrench = useLocaleContext().locale === "fr-CA";
  const t = isFrench ? words.fr : words.en;
  const thanksCopy = boardEvaluationThankYouCopy(survey.thankYouCopy);
  const draftKey = `olea_board_evaluation_${survey.kind}_${survey.token}`;
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [openEnded, setOpenEnded] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (draft && typeof draft === "object") {
        if (draft.answers && typeof draft.answers === "object") setAnswers(draft.answers);
        if (draft.openEnded && typeof draft.openEnded === "object") setOpenEnded(draft.openEnded);
        if (typeof draft.comment === "string") setComment(draft.comment);
      }
    } catch { /* An invalid local draft is ignored. */ }
  }, [draftKey]);

  function saveDraft(nextAnswers: Record<string, Answer>, nextOpen: Record<string, string>, nextComment: string) {
    try { localStorage.setItem(draftKey, JSON.stringify({ answers: nextAnswers, openEnded: nextOpen, comment: nextComment })); }
    catch { /* The form remains usable when storage is unavailable. */ }
  }

  function rate(id: string, value: Answer) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setShowIncomplete(false);
    saveDraft(next, openEnded, comment);
  }

  function writeOpen(id: string, value: string) {
    const next = { ...openEnded, [id]: value };
    setOpenEnded(next);
    saveDraft(answers, next, comment);
  }

  function writeComment(value: string) {
    setComment(value);
    saveDraft(answers, openEnded, value);
  }

  const answered = survey.selectedRated.filter((id) => answers[id] !== undefined).length;
  const total = survey.selectedRated.length;

  async function submit() {
    if (!survey.open || pending) return;
    if (survey.kind === "annual" && answered < total && !showIncomplete) {
      setShowIncomplete(true);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/board-evaluation/submit/${survey.kind}/${survey.token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(survey.kind === "annual"
          ? { ratings: answers, openEnded }
          : { ratings: answers, comment }),
      });
      if (!response.ok) throw new Error("Save failed");
      localStorage.removeItem(draftKey);
      setSubmitted(true);
    } catch { setError(t.error); }
    finally { setPending(false); }
  }

  function reset() {
    localStorage.removeItem(draftKey);
    setAnswers({}); setOpenEnded({}); setComment("");
    setSubmitted(false); setShowIncomplete(false); setError("");
  }

  const selected = new Set(survey.selectedRated);
  const localizedRated = isFrench ? ratedBankFr : ratedBank;
  const localizedMeeting = isFrench
    ? meetingBank.map((question) => ({ ...question,
        text: meetingBankFr.find((item) => item[0] === question.id)?.[1] ?? question.text,
        category: meetingCategoryFr[question.category] ?? question.category,
      }))
    : meetingBank;
  const sections = survey.kind === "annual" && survey.selectionMode === "bank"
    ? [...new Set(localizedRated.map((question) => question.category))].map((category, sectionIndex) => ({
        key: `bank-${sectionIndex}`, name: category,
        prompt: localizedRated.find((question) => question.category === category)?.prompt || "",
        questions: localizedRated.filter((question) => question.category === category && selected.has(question.id))
          .map((question) => ({ id: question.id, text: question.text })),
      })).filter((section) => section.questions.length)
    : survey.kind === "annual"
    ? annualSurveySections.map((section, sectionIndex) => ({
        key: String(section.num),
        name: isFrench ? annualSurveySectionsFr[sectionIndex].name : section.name,
        prompt: isFrench ? annualSurveySectionsFr[sectionIndex].prompt : section.prompt,
        questions: section.qs.map((text, index) => ({
          id: `s${section.num}q${index}`,
          text: isFrench ? annualSurveySectionsFr[sectionIndex].qs[index] : text,
        }))
          .filter((question) => selected.has(question.id)),
      })).filter((section) => section.questions.length)
    : survey.selectionMode === "bank"
      ? [...new Set(localizedMeeting.map((question) => question.category))].map((category, sectionIndex) => ({
          key: `meeting-bank-${sectionIndex}`, name: category, prompt: "",
          questions: localizedMeeting.filter((question) => question.category === category && selected.has(question.id))
            .map((question) => ({ id: question.id, text: question.text })),
        })).filter((section) => section.questions.length)
      : meetingSurveyGroups.map((group, groupIndex) => ({
        key: String(groupIndex), name: isFrench ? meetingSurveyGroupsFr[groupIndex].name : group.name, prompt: "",
        questions: group.qs.map((text, index) => ({
          id: `g${groupIndex}q${index}`,
          text: isFrench ? meetingSurveyGroupsFr[groupIndex].qs[index] : text,
        }))
          .filter((question) => selected.has(question.id)),
      })).filter((section) => section.questions.length);
  const openQuestions = survey.selectionMode === "bank"
    ? (isFrench ? openBankFr : openBank).filter((question) => survey.selectedOpen.includes(question.id)).map((question) => ({ id: question.id, text: question.text }))
    : annualOpenQuestions.map((question, index) => ({ id: String(index), text: isFrench ? annualOpenQuestionsFr[index] : question }));
  const meetingOpenPrompt = survey.selectedOpen.length
    ? (isFrench ? meetingOpenBankFr : meetingOpenBank).find((question) => question.id === survey.selectedOpen[0])?.text
    : undefined;

  return <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-xl border bg-white p-5 shadow-sm sm:p-8" style={{ borderBottom: `4px solid ${survey.primaryColor}` }}>
        <div className="flex items-center gap-4">
          {survey.logoUrl ? <img src={survey.logoUrl} alt="" className="h-12 max-w-40 object-contain" /> : null}
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{survey.organizationName}</p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">{survey.kind === "annual" ? t.annual : t.meeting}</h1>
            <p className="mt-1 text-sm text-slate-600">{survey.kind === "annual" ? survey.year : `${survey.title} · ${survey.meetingDate}`}</p>
          </div>
        </div>
      </header>

      {submitted ? <Card><CardContent className="space-y-4 p-7 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-10 text-green-700" aria-hidden="true" />
        <h2 className="text-2xl font-bold">{survey.kind === "annual" ? (isFrench ? thanksCopy.frTitle : thanksCopy.enTitle) : t.thanks}</h2>
        <p className="text-slate-600">{survey.kind === "annual" ? (isFrench ? thanksCopy.frMessage : thanksCopy.enMessage) : t.thanksBody}</p>
        <Button type="button" variant="outline" onClick={reset}><RotateCcw className="size-4" />{t.newResponse}</Button>
      </CardContent></Card> : !survey.open ? <Card><CardContent className="p-7 text-center text-slate-700">{t.closed}</CardContent></Card> : <>
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950">
          <LockKeyhole className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p>{t.anonymous}</p>
        </div>
        <div className="sticky top-0 z-10 rounded-xl border bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>{answered} / {total} {t.progress}</strong><Badge variant="outline">{total - answered} {t.remaining}</Badge></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={total} aria-label={t.progress}>
            <div className="h-full rounded-full transition-all" style={{ width: `${total ? Math.round(answered / total * 100) : 0}%`, backgroundColor: survey.primaryColor }} />
          </div>
        </div>
        <p className="rounded-lg border bg-white p-3 text-xs text-slate-600">{survey.kind === "annual" ? t.scaleAnnual : t.scaleMeeting}</p>
        {sections.map((section) => <Card key={section.key}><CardContent className="space-y-5 p-5 sm:p-7">
          <div><h2 className="text-lg font-bold text-slate-900">{section.name}</h2>{section.prompt ? <p className="mt-1 text-sm text-slate-600">{section.prompt}</p> : null}</div>
          {section.questions.map((question) => <div key={question.id} className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium leading-6 text-slate-800" id={`question-${question.id}`}>{question.text}</p>
            <div role="group" aria-labelledby={`question-${question.id}`} className="flex flex-wrap gap-2">
              {(survey.kind === "annual" ? [1, 2, 3, 4, 5, "na"] : [1, 2, 3, 4, 5]).map((value) => <Button key={value} type="button" size="sm"
                variant={answers[question.id] === value ? "default" : "outline"}
                aria-pressed={answers[question.id] === value}
                aria-label={value === "na" ? (isFrench ? "Sans objet" : "Not applicable") : `${isFrench ? "Note" : "Rating"} ${value}`}
                onClick={() => rate(question.id, value as Answer)}>{value === "na" ? (isFrench ? "S/O" : "N/A") : value}</Button>)}
            </div>
          </div>)}
        </CardContent></Card>)}
        {survey.kind === "annual" ? <Card><CardContent className="space-y-5 p-5 sm:p-7">
          <h2 className="text-lg font-bold">{t.openQuestions}</h2>
          {openQuestions.map((question) => <div key={question.id} className="space-y-2">
            <label htmlFor={`open-${question.id}`} className="text-sm font-medium text-slate-800">{question.text}</label>
            <Textarea id={`open-${question.id}`} maxLength={4000} value={openEnded[question.id] || ""} onChange={(event) => writeOpen(question.id, event.target.value)} />
            <p className="text-xs text-slate-500">{t.maxChars}</p>
          </div>)}
        </CardContent></Card> : <Card><CardContent className="space-y-2 p-5 sm:p-7">
          <label htmlFor="meeting-comment" className="text-lg font-bold">{meetingOpenPrompt || t.optionalComment}</label>
          <Textarea id="meeting-comment" maxLength={4000} value={comment} onChange={(event) => writeComment(event.target.value)} />
          <p className="text-xs text-slate-500">{t.maxChars}</p>
        </CardContent></Card>}
        {showIncomplete ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{t.incomplete}</p> : null}
        {error ? <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        <div className="flex justify-end pb-8"><Button type="button" size="lg" disabled={pending} onClick={() => void submit()}>{pending ? t.submitting : t.submit}</Button></div>
      </>}
    </div>
  </main>;
}
