"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, Headphones, StopCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  completeTrainingLessonAction, issueTrainingCertificateAction, saveTrainingActionPlanAction,
  saveTrainingConfidenceAction, saveTrainingLanguageAction, signTrainingOrganizationAction,
  submitTrainingAssessmentAction,
} from "@/app/modules/board-training/actions";
import { TrainingBlocks, TrainingText } from "@/app/modules/board-training/_components/training-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingLanguage } from "@/lib/board-training/content";
import type { getTrainingCoursePageData } from "@/lib/data/board-training";

type PageData = NonNullable<Awaited<ReturnType<typeof getTrainingCoursePageData>>>;
type Stage = "welcome" | "before" | "org" | "quiz" | "plan" | "ack" | "cert" | string;
type AssessmentResult = { score: number; total: number; passed: boolean; feedback: Array<{ id: string; explanation: string; correctAnswer?: string }> };

const labels = {
  en: {
    allCourses: "All courses", welcome: "Welcome", before: "Starting reflection", org: "Our organization", quiz: "Assessment", plan: "Action plan", ack: "Acknowledgement", cert: "Certificate",
    lesson: "Lesson", of: "of", minutes: "min", progress: "Lessons completed", testOutPassed: "Assessment passed without lessons", back: "Back", continue: "Continue", finish: "Complete and continue",
    start: "Begin Lesson 1", testOut: "Take the assessment first", testOutHint: "You get one test-out attempt before starting the lessons.",
    listen: "Listen to this lesson", stop: "Stop listening", jurisdiction: "Showing rules for",
    chooseAll: "Choose a rating from 1 to 5 for each area before continuing.", save: "Save and continue",
    reviewed: "I reviewed the documents my organization provided.", noInterests: "I have no interests to declare.", interests: "I have interests to declare.",
    interestsHint: "Describe employment, business, family, board, or funding interests. At least 4 characters.", conduct: "I have read and agree to the code of conduct.", signature: "Type your full name to sign", signatureHint: "2 to 160 characters, as you would sign a declaration.", sign: "Sign and continue",
    answered: "answered", passMark: "Pass mark", submit: "Submit answers", passed: "You passed", failed: "Not quite yet", retry: "Retake assessment", startLessons: "Start the lessons", result: "Your result", explanation: "Why it matters",
    choosePlan: "Choose up to three actions for the next 90 days.", custom: "Your own action (optional)", customHint: "Up to 300 characters; counts as one of your three actions.", previous: "How did last year’s actions go?", done: "Done", partly: "Partly", notYet: "Not yet",
    fullName: "Full name for your certificate", fullNameHint: "2 to 160 characters; this name will appear on the certificate.", complete: "Complete course", certificate: "Certificate of completion", emailPending: "Your certificate is ready. Email delivery is pending; you can download it now.", download: "Download PDF", verify: "Verify certificate",
  },
  fr: {
    allCourses: "Toutes les formations", welcome: "Bienvenue", before: "Bilan initial", org: "Notre organisme", quiz: "Évaluation", plan: "Plan d’action", ack: "Attestation", cert: "Certificat",
    lesson: "leçons", of: "sur", minutes: "min", progress: "Leçons terminées", testOutPassed: "Évaluation réussie sans les leçons", back: "Retour", continue: "Continuer", finish: "Terminer et continuer",
    start: "Commencer la leçon 1", testOut: "Passer l’évaluation d’abord", testOutHint: "Vous avez une seule tentative d’exemption avant les leçons.",
    listen: "Écouter cette leçon", stop: "Arrêter l’écoute", jurisdiction: "Règles affichées pour",
    chooseAll: "Choisissez une note de 1 à 5 pour chaque domaine avant de continuer.", save: "Enregistrer et continuer",
    reviewed: "J’ai consulté les documents fournis par mon organisme.", noInterests: "Je n’ai aucun intérêt à déclarer.", interests: "J’ai des intérêts à déclarer.",
    interestsHint: "Décrivez les intérêts liés à un emploi, une entreprise, la famille, un conseil ou du financement. Au moins 4 caractères.", conduct: "J’ai lu le code de conduite et je l’accepte.", signature: "Tapez votre nom complet pour signer", signatureHint: "2 à 160 caractères, comme sur une déclaration.", sign: "Signer et continuer",
    answered: "réponses", passMark: "Note de passage", submit: "Soumettre les réponses", passed: "Réussi", failed: "Pas tout à fait", retry: "Reprendre l’évaluation", startLessons: "Commencer les leçons", result: "Votre résultat", explanation: "Pourquoi c’est important",
    choosePlan: "Choisissez jusqu’à trois actions pour les 90 prochains jours.", custom: "Votre propre action (facultatif)", customHint: "300 caractères maximum; compte parmi vos trois actions.", previous: "Comment se sont passées les actions de l’an dernier?", done: "Fait", partly: "En partie", notYet: "Pas encore",
    fullName: "Nom complet sur le certificat", fullNameHint: "2 à 160 caractères; ce nom figurera sur le certificat.", complete: "Terminer la formation", certificate: "Certificat de réussite", emailPending: "Votre certificat est prêt. L’envoi par courriel est en attente; vous pouvez le télécharger.", download: "Télécharger le PDF", verify: "Vérifier le certificat",
  },
};

function nextStage(data: PageData): Stage {
  const { enrollment, course, certificate } = data;
  if (certificate) return "cert";
  if (course.reflection && !enrollment.before_completed_at) return "welcome";
  if (!course.reflection && !enrollment.completed_lessons.length && !enrollment.passed_at && !enrollment.organization_signed_at) return "welcome";
  if (enrollment.passed_at && !enrollment.organization_signed_at) return "org";
  const nextLesson = course.lessons.find((lesson) => !enrollment.completed_lessons.includes(lesson.id));
  if (nextLesson && !enrollment.passed_at) return nextLesson.id;
  if (!enrollment.organization_signed_at) return "org";
  if (!enrollment.passed_at) return "quiz";
  if (!enrollment.action_plan.length || (course.reflection && !Object.keys(enrollment.confidence_after).length)) return "plan";
  return "ack";
}

export function BoardTrainingPlayer({ data }: { data: PageData }) {
  const { course, enrollment } = data;
  const language = enrollment.locale;
  const t = labels[language];
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const retryFocusRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<Stage>(() => nextStage(data));
  const [message, setMessage] = useState("");
  const [testOut, setTestOut] = useState(false);
  const [testOutUsedLocally, setTestOutUsedLocally] = useState(enrollment.test_out_used);
  const [passedLocally, setPassedLocally] = useState(Boolean(enrollment.passed_at));
  const [completedLessons, setCompletedLessons] = useState(enrollment.completed_lessons);
  const [organizationSignedLocally, setOrganizationSignedLocally] = useState(Boolean(enrollment.organization_signed_at));
  const [planSavedLocally, setPlanSavedLocally] = useState(Boolean(enrollment.action_plan.length));
  const [pendingTestOut, setPendingTestOut] = useState(false);
  const [before, setBefore] = useState<Record<string, number>>(enrollment.confidence_before);
  const [beforeSaved, setBeforeSaved] = useState(Boolean(enrollment.before_completed_at));
  const [after, setAfter] = useState<Record<string, number>>(enrollment.confidence_after);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [noInterests, setNoInterests] = useState<boolean | null>(null);
  const [interests, setInterests] = useState("");
  const [conduct, setConduct] = useState(false);
  const [signature, setSignature] = useState(data.memberName);
  const savedPlan = enrollment.action_plan.map((item) => {
    const otherIndex = data.alternateSuggestions.indexOf(item);
    return otherIndex >= 0 ? course.actionPlan?.suggestions[otherIndex] ?? item : item;
  });
  const [selectedPlan, setSelectedPlan] = useState<string[]>(savedPlan.filter((item) => course.actionPlan?.suggestions.includes(item)));
  const [customPlan, setCustomPlan] = useState(savedPlan.find((item) => !course.actionPlan?.suggestions.includes(item)) ?? "");
  const [followUp, setFollowUp] = useState<Record<string, string>>(enrollment.follow_up);
  const [accepted, setAccepted] = useState<number[]>([]);
  const [certificateName, setCertificateName] = useState(data.memberName);
  const [listening, setListening] = useState(false);
  const lessonsDone = course.lessons.every((lesson) => completedLessons.includes(lesson.id));
  const lesson = course.lessons.find((item) => item.id === stage);
  const progress = Math.round((completedLessons.length / course.lessons.length) * 100);
  const hasConduct = data.documents.some((document) => document.kind === "code_of_conduct");
  const selectedCount = selectedPlan.length + (customPlan.trim() ? 1 : 0);
  const questionCount = data.questions.length;
  const canTestOut = course.testOut.enabled && !testOutUsedLocally && completedLessons.length === 0 && !passedLocally;

  useEffect(() => () => window.speechSynthesis?.cancel(), [stage, language]);
  useEffect(() => {
    const heading = mainRef.current?.querySelector("h1");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [stage]);
  useEffect(() => {
    if (!result) {
      if (retryFocusRef.current) {
        retryFocusRef.current = false;
        const heading = mainRef.current?.querySelector<HTMLElement>("h1");
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({ behavior: "auto", block: "start" });
      }
      return;
    }
    const resultCard = mainRef.current?.querySelector<HTMLElement>("[data-training-result]");
    resultCard?.focus({ preventScroll: true });
    resultCard?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [result]);
  useEffect(() => {
    if (!message) return;
    const error = mainRef.current?.querySelector<HTMLElement>("[data-training-error]");
    error?.focus({ preventScroll: true });
    error?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [message]);

  function perform<T>(operation: () => Promise<{ ok: true; value: T } | { ok: false; error: string }>, onSuccess: (value: T) => void, refreshPage = true) {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await operation();
        if (!response.ok) { setMessage(response.error); return; }
        onSuccess(response.value);
        if (refreshPage) router.refresh();
      } catch { setMessage(language === "fr" ? "Impossible d’enregistrer. Réessayez." : "Could not save. Please try again."); }
    });
  }

  function startLesson() {
    if (course.reflection && !beforeSaved) { setPendingTestOut(false); setStage("before"); }
    else setStage(course.lessons[0].id);
  }

  function startTestOut() {
    if (course.reflection && !beforeSaved) { setPendingTestOut(true); setStage("before"); }
    else { setTestOut(true); setStage("quiz"); }
  }

  function speakLesson() {
    if (!lesson || !("speechSynthesis" in window)) return;
    if (listening) { window.speechSynthesis.cancel(); setListening(false); return; }
    const sections = lesson.blocks.flatMap((block) => {
      if (block.type === "text" || block.type === "takeaway" || block.type === "callout") return [block.body];
      if (block.type === "keypoints" || block.type === "questions") return block.items;
      if (block.type === "jurisdiction") return block.variants[data.settings.jurisdiction] ?? block.variants.other ?? [];
      if (block.type === "scenario") return [block.situation, block.debrief];
      return [];
    });
    const utterance = new SpeechSynthesisUtterance(sections.join(". ").replaceAll("**", ""));
    utterance.lang = language === "fr" ? "fr-CA" : "en-CA";
    const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase() === utterance.lang.toLowerCase());
    if (voice) utterance.voice = voice;
    utterance.rate = 0.94;
    utterance.onend = () => setListening(false);
    window.speechSynthesis.speak(utterance);
    setListening(true);
  }

  const steps = useMemo(() => [
    { id: "welcome", label: t.welcome },
    ...(course.reflection ? [{ id: "before", label: t.before }] : []),
    ...course.lessons.map((item, index) => ({ id: item.id, label: `${index + 1}. ${item.title}` })),
    { id: "org", label: t.org }, { id: "quiz", label: t.quiz },
    { id: "plan", label: t.plan }, { id: "ack", label: t.ack }, { id: "cert", label: t.cert },
  ], [course, t]);
  const allowed = (id: string) => id === "welcome" || (id === "before" && Boolean(course.reflection)) ||
    course.lessons.some((item, index) => item.id === id && (index === 0 ? beforeSaved || !course.reflection : completedLessons.includes(course.lessons[index - 1].id))) ||
    (id === "org" && (lessonsDone || passedLocally)) ||
    (id === "quiz" && ((lessonsDone && organizationSignedLocally) || canTestOut || passedLocally)) ||
    (id === "plan" && passedLocally && organizationSignedLocally) ||
    (id === "ack" && planSavedLocally) || (id === "cert" && Boolean(data.certificate));

  return <div className="mx-auto max-w-6xl space-y-5" data-testid="board-training-player">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild size="sm" variant="ghost"><Link href="/modules/board-training"><ArrowLeft className="mr-2 size-4" />{t.allCourses}</Link></Button><Select value={language} onValueChange={(value) => perform(() => saveTrainingLanguageAction({ enrollmentId: enrollment.id, language: value as TrainingLanguage }), () => { router.refresh(); })}><SelectTrigger className="w-36" aria-label="Course language"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="fr">Français</SelectItem></SelectContent></Select></div>
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start"><Card><CardContent className="space-y-3 pt-5"><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.progress}</p><p className="font-semibold text-slate-900">{course.title}</p>{passedLocally && !completedLessons.length ? <p className="text-sm text-emerald-800">{t.testOutPassed}</p> : <><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-olea-green" style={{ width: `${progress}%` }} /></div><p className="text-xs text-slate-600">{completedLessons.length} {t.of} {course.lessons.length} {t.lesson.toLowerCase()}</p></>}</CardContent></Card>
        <nav aria-label={t.progress} className="flex gap-1 overflow-x-auto pb-2 lg:flex-col">{steps.map((item) => <Button key={item.id} type="button" size="sm" variant={stage === item.id ? "secondary" : "ghost"} disabled={!allowed(item.id)} className="h-auto min-w-max justify-start whitespace-normal text-left lg:w-full" onClick={() => { if (item.id === "quiz" && canTestOut && !lessonsDone) setTestOut(true); setStage(item.id); setMessage(""); }} aria-current={stage === item.id ? "step" : undefined}>{course.lessons.some((part) => part.id === item.id) && completedLessons.includes(item.id) ? <Check className="mr-2 size-4 shrink-0" /> : null}{item.label}</Button>)}</nav>
      </aside>
      <main ref={mainRef} className="min-w-0 space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-8">
        {message && <p data-training-error role="alert" tabIndex={-1} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
        {stage === "welcome" && <div className="space-y-6"><div className="space-y-2"><Badge variant="secondary">{course.estimatedMinutes} {t.minutes}</Badge><h1 className="text-3xl font-semibold tracking-tight text-teal-900">{course.welcome.heading}</h1><p className="text-slate-600">{course.subtitle}</p></div>
          {course.media.welcomeVideo.url && <video controls className="aspect-video w-full rounded-xl bg-slate-900" src={course.media.welcomeVideo.url} aria-label={course.media.welcomeVideo.title} />}
          {course.welcome.body.map((paragraph, index) => <p key={index} className="leading-7 text-slate-700"><TrainingText text={paragraph} /></p>)}
          <Card className="bg-slate-50"><CardHeader><CardTitle className="text-lg">{language === "fr" ? "À la fin, vous pourrez" : "By the end, you will be able to"}</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">{course.welcome.outcomes.map((outcome, index) => <li key={index}>{outcome}</li>)}</ul></CardContent></Card>
          <div className="flex flex-wrap gap-3"><Button onClick={startLesson}>{t.start}<ArrowRight className="ml-2 size-4" /></Button>{canTestOut && <Button variant="outline" onClick={startTestOut}>{t.testOut}</Button>}</div>{canTestOut && <p className="text-sm text-slate-500">{t.testOutHint}</p>}
        </div>}
        {stage === "before" && course.reflection && <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.before}</p><h1 className="mt-2 text-3xl font-semibold text-teal-900">{course.reflection.before.heading}</h1><p className="mt-3 text-slate-600">{course.reflection.before.intro}</p></div>
          {course.reflection.topics.map((topic) => <div key={topic.id} role="group" aria-label={topic.label} className="space-y-2 border-b pb-4"><p className="font-medium">{topic.label}</p><div className="flex flex-wrap gap-2">{course.reflection!.scale.map((label, index) => <Button key={index} size="sm" variant={before[topic.id] === index + 1 ? "default" : "outline"} aria-pressed={before[topic.id] === index + 1} onClick={() => setBefore({ ...before, [topic.id]: index + 1 })}>{index + 1} · {label}</Button>)}</div></div>)}<p className="text-sm text-slate-500">{t.chooseAll}</p><div className="flex gap-2"><Button variant="outline" onClick={() => setStage("welcome")}>{t.back}</Button><Button disabled={pending || course.reflection.topics.some((topic) => !before[topic.id])} onClick={() => perform(() => saveTrainingConfidenceAction({ enrollmentId: enrollment.id, phase: "before", values: before }), () => { setBeforeSaved(true); setTestOut(pendingTestOut); setStage(pendingTestOut ? "quiz" : course.lessons[0].id); }, false)}>{t.save}</Button></div>
        </div>}
        {lesson && <div className="space-y-6"><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{language === "fr" ? "Leçon" : "Lesson"} {course.lessons.indexOf(lesson) + 1} {t.of} {course.lessons.length} · {lesson.minutes} {t.minutes}</p><h1 className="text-3xl font-semibold tracking-tight text-teal-900">{lesson.title}</h1>{lesson.blocks.some((block) => block.type === "jurisdiction") && <p className="text-sm text-slate-500">{t.jurisdiction} {course.jurisdictions?.find((item) => item.id === data.settings.jurisdiction)?.label ?? data.settings.jurisdiction}</p>}</div>
          <Button variant="outline" size="sm" onClick={speakLesson}>{listening ? <StopCircle className="mr-2 size-4" /> : <Headphones className="mr-2 size-4" />}{listening ? t.stop : t.listen}</Button>
          <TrainingBlocks blocks={lesson.blocks} jurisdiction={data.settings.jurisdiction} language={language} />
          <div className="flex justify-between gap-3 border-t pt-5"><Button variant="outline" onClick={() => setStage(course.lessons.indexOf(lesson) === 0 ? course.reflection ? "before" : "welcome" : course.lessons[course.lessons.indexOf(lesson) - 1].id)}>{t.back}</Button><Button disabled={pending} onClick={() => perform(() => completeTrainingLessonAction({ enrollmentId: enrollment.id, lessonId: lesson.id }), () => { setCompletedLessons((current) => current.includes(lesson.id) ? current : [...current, lesson.id]); const next = course.lessons[course.lessons.indexOf(lesson) + 1]; setStage(next?.id ?? "org"); }, false)}>{t.finish}<ArrowRight className="ml-2 size-4" /></Button></div>
        </div>}
        {stage === "org" && <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.org}</p><h1 className="mt-2 text-3xl font-semibold text-teal-900">{course.orgLesson.title}</h1><p className="mt-3 text-slate-600">{course.orgLesson.intro}</p></div>
          <Card><CardHeader><CardTitle className="text-lg">{course.orgLesson.documentsHeading ?? t.org}</CardTitle></CardHeader><CardContent className="space-y-3">{data.documents.length ? data.documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{document.title}</span>{document.url && <Button asChild size="sm" variant="outline"><a href={document.url} target="_blank" rel="noreferrer">{language === "fr" ? "Ouvrir le PDF" : "Open PDF"}</a></Button>}</div>) : <p className="text-sm text-slate-600">{course.orgLesson.noDocuments ?? "No documents yet."}</p>}{data.documents.length > 0 && <label className="flex items-start gap-3 text-sm"><Checkbox checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />{course.orgLesson.reviewedLabel ?? t.reviewed}</label>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">{course.orgLesson.coi.heading}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-slate-600">{course.orgLesson.coi.intro}</p><div className="flex flex-wrap gap-2"><Button variant={noInterests === true ? "default" : "outline"} aria-pressed={noInterests === true} onClick={() => setNoInterests(true)}>{course.orgLesson.coi.noneLabel}</Button><Button variant={noInterests === false ? "default" : "outline"} aria-pressed={noInterests === false} onClick={() => setNoInterests(false)}>{course.orgLesson.coi.listLabel}</Button></div>{noInterests === false && <div className="space-y-2"><Label htmlFor="coi-interests">{t.interests}</Label><Textarea id="coi-interests" maxLength={2000} rows={4} value={interests} onChange={(event) => setInterests(event.target.value)} placeholder={course.orgLesson.coi.placeholder} /><p className="text-xs text-slate-500">{t.interestsHint}</p></div>}{course.orgLesson.coi.commitment && <p className="text-sm text-slate-600">{course.orgLesson.coi.commitment}</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">{course.orgLesson.conduct.heading}</CardTitle></CardHeader><CardContent>{hasConduct ? <label className="flex items-start gap-3 text-sm"><Checkbox checked={conduct} onChange={(event) => setConduct(event.target.checked)} />{course.orgLesson.conduct.statement}</label> : <p className="text-sm text-slate-600">{course.orgLesson.conduct.missing}</p>}</CardContent></Card>
          <div className="space-y-2"><Label htmlFor="declaration-signature">{course.orgLesson.signatureLabel}</Label><Input id="declaration-signature" autoComplete="name" maxLength={160} value={signature} onChange={(event) => setSignature(event.target.value)} /><p className="text-xs text-slate-500">{t.signatureHint}</p></div>
          <div className="flex justify-between gap-3 border-t pt-5"><Button variant="outline" onClick={() => setStage(passedLocally ? "quiz" : course.lessons.at(-1)?.id ?? "welcome")}>{t.back}</Button><Button disabled={pending || noInterests === null || (!noInterests && interests.trim().length < 4) || (data.documents.length > 0 && !reviewed) || (hasConduct && !conduct) || signature.trim().length < 2} onClick={() => perform(() => signTrainingOrganizationAction({ enrollmentId: enrollment.id, noInterests: Boolean(noInterests), interests, reviewed, conduct, signature }), () => { setOrganizationSignedLocally(true); setStage(passedLocally ? "plan" : "quiz"); }, false)}>{t.sign}</Button></div>
        </div>}
        {stage === "quiz" && <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.quiz}</p><h1 className="mt-2 text-3xl font-semibold text-teal-900">{t.quiz}</h1><p className="mt-2 text-sm text-slate-600">{questionCount} {language === "fr" ? "questions" : "questions"} · {t.passMark} {course.passMarkPercent}%</p></div>
          {result && <Card data-training-result role="status" tabIndex={-1} className={result.passed ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}><CardContent className="space-y-3 pt-6"><p className="text-3xl font-semibold">{result.score} / {result.total}</p><p className="font-semibold">{result.passed ? t.passed : t.failed}</p>{result.passed ? <Button onClick={() => setStage(organizationSignedLocally ? "plan" : "org")}>{t.continue}</Button> : testOut || !lessonsDone ? <Button onClick={() => { setResult(null); setAnswers({}); setTestOut(false); setStage(course.lessons[0].id); }}>{t.startLessons}</Button> : <Button variant="outline" onClick={() => { retryFocusRef.current = true; setResult(null); setAnswers({}); setTestOut(false); }}>{t.retry}</Button>}</CardContent></Card>}
          {data.questions.map((question, index) => <Card key={question.id}><CardContent className="space-y-3 pt-6"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{index + 1} / {questionCount}</p><h2 className="font-semibold text-slate-900">{question.prompt}</h2><div className="grid gap-2">{question.options.map((option) => <Button key={option.id} variant={answers[question.id] === option.id ? "default" : "outline"} aria-pressed={answers[question.id] === option.id} disabled={Boolean(result)} className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setAnswers({ ...answers, [question.id]: option.id })}>{option.text}</Button>)}</div>{result?.feedback.find((item) => item.id === question.id) && <div className="rounded-lg bg-teal-50 p-3 text-sm"><strong>{t.explanation}: </strong>{result.feedback.find((item) => item.id === question.id)?.explanation}</div>}</CardContent></Card>)}
          {!result && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><span className="text-sm text-slate-600">{Object.keys(answers).length} / {questionCount} {t.answered}</span><Button disabled={pending || Object.keys(answers).length !== questionCount} onClick={() => perform(() => submitTrainingAssessmentAction({ enrollmentId: enrollment.id, answers, testOut }), (value) => { const assessment = value as AssessmentResult; setResult(assessment); setPassedLocally(assessment.passed); if (testOut) setTestOutUsedLocally(true); }, false)}>{t.submit}</Button></div>}
        </div>}
        {stage === "plan" && <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.plan}</p><h1 className="mt-2 text-3xl font-semibold text-teal-900">{course.actionPlan?.heading ?? t.plan}</h1><p className="mt-3 text-slate-600">{course.actionPlan?.intro}</p></div>
          {course.reflection && <Card><CardHeader><CardTitle className="text-lg">{course.reflection.after.heading}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-slate-600">{course.reflection.after.intro}</p>{course.reflection.topics.map((topic) => <div key={topic.id} role="group" aria-label={topic.label} className="space-y-2 border-b pb-4"><p className="font-medium">{topic.label}</p><p className="text-xs text-slate-500">{language === "fr" ? "Avant" : "Before"}: {before[topic.id] ?? "—"}</p><div className="flex flex-wrap gap-2">{course.reflection!.scale.map((label, index) => <Button key={index} size="sm" variant={after[topic.id] === index + 1 ? "default" : "outline"} aria-pressed={after[topic.id] === index + 1} onClick={() => setAfter({ ...after, [topic.id]: index + 1 })}>{index + 1} · {label}</Button>)}</div></div>)}</CardContent></Card>}
          {data.previousPlan.length > 0 && enrollment.course_id === "refresher" && <Card><CardHeader><CardTitle className="text-lg">{t.previous}</CardTitle></CardHeader><CardContent className="space-y-3">{data.previousPlan.map((item, index) => <div key={index} className="space-y-2 border-b pb-3"><p>{item}</p><div className="flex gap-2">{(["done", "partly", "not_yet"] as const).map((status) => <Button key={status} size="sm" variant={followUp[String(index)] === status ? "default" : "outline"} aria-pressed={followUp[String(index)] === status} onClick={() => setFollowUp({ ...followUp, [String(index)]: status })}>{status === "done" ? t.done : status === "partly" ? t.partly : t.notYet}</Button>)}</div></div>)}</CardContent></Card>}
          {course.actionPlan && <Card><CardHeader><CardTitle className="text-lg">{t.choosePlan}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-slate-600">{selectedCount} / {course.actionPlan.max}</p>{course.actionPlan.suggestions.map((suggestion, index) => <label key={index} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={selectedPlan.includes(suggestion)} disabled={!selectedPlan.includes(suggestion) && selectedCount >= course.actionPlan!.max} onChange={(event) => setSelectedPlan(event.target.checked ? [...selectedPlan, suggestion] : selectedPlan.filter((item) => item !== suggestion))} />{suggestion}</label>)}<div className="space-y-2 pt-2"><Label htmlFor="custom-action">{t.custom}</Label><Input id="custom-action" maxLength={300} disabled={!customPlan && selectedCount >= course.actionPlan.max} value={customPlan} onChange={(event) => setCustomPlan(event.target.value)} placeholder={course.actionPlan.customPlaceholder} /><p className="text-xs text-slate-500">{t.customHint}</p></div></CardContent></Card>}
          <Button disabled={pending || selectedCount < 1 || selectedCount > (course.actionPlan?.max ?? 3) || Boolean(course.reflection?.topics.some((topic) => !after[topic.id]))} onClick={() => { const plan = [...selectedPlan, ...(customPlan.trim() ? [customPlan.trim()] : [])]; perform(async () => { if (course.reflection) { const saved = await saveTrainingConfidenceAction({ enrollmentId: enrollment.id, phase: "after", values: after }); if (!saved.ok) return saved; } return saveTrainingActionPlanAction({ enrollmentId: enrollment.id, plan, followUp }); }, () => { setPlanSavedLocally(true); setStage("ack"); }, false); }}>{t.save}<ArrowRight className="ml-2 size-4" /></Button>
        </div>}
    {stage === "ack" && <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.ack}</p><h1 className="mt-2 text-3xl font-semibold text-teal-900">{course.attestation.heading}</h1></div>{course.attestation.statements.map((statement, index) => <label key={index} className="flex items-start gap-3 rounded-lg border p-4 text-sm"><Checkbox checked={accepted.includes(index)} onChange={(event) => setAccepted(event.target.checked ? [...accepted, index] : accepted.filter((item) => item !== index))} />{statement}</label>)}<div className="space-y-2"><Label htmlFor="certificate-name">{t.fullName}</Label><Input id="certificate-name" autoComplete="name" maxLength={160} value={certificateName} onChange={(event) => setCertificateName(event.target.value)} /><p className="text-xs text-slate-500">{t.fullNameHint}</p></div><div className="flex justify-between gap-3"><Button variant="outline" onClick={() => setStage("plan")}>{t.back}</Button><Button disabled={pending || accepted.length !== course.attestation.statements.length || certificateName.trim().length < 2} onClick={() => perform(() => issueTrainingCertificateAction({ enrollmentId: enrollment.id, name: certificateName, acknowledgedStatements: accepted }), () => setStage("cert"))}>{t.complete}</Button></div></div>}
    {stage === "cert" && <div className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{t.cert}</p><h1 className="mt-2 text-3xl font-semibold text-teal-900">{course.closing.heading}</h1><p className="mt-3 text-slate-600"><TrainingText text={course.closing.body} /></p></div>{data.certificate ? <Card className="border-teal-300"><CardContent className="space-y-4 py-10 text-center"><GraduationCapIcon /><p className="text-sm uppercase tracking-widest text-teal-700">{t.certificate}</p><h2 className="text-2xl font-semibold">{data.certificate.display_name}</h2><p>{course.title}</p><p className="text-sm text-slate-600">{data.certificate.certificate_number}</p><div className="flex flex-wrap justify-center gap-3"><Button asChild><Link href={`/api/board-training/certificates/${data.certificate.id}/pdf`}>{t.download}</Link></Button><Button asChild variant="outline"><Link href={`/verify/training/${data.certificate.certificate_number}`}>{t.verify}</Link></Button></div>{!data.certificate.emailed_at && <p className="text-sm text-amber-800">{t.emailPending}</p>}</CardContent></Card> : <p role="status" className="text-sm text-slate-600">{language === "fr" ? "Chargement du certificat…" : "Loading certificate…"}</p>}</div>}
      </main>
    </div>
  </div>;
}

function GraduationCapIcon() {
  return <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-800"><BookOpen className="size-7" /></span>;
}
