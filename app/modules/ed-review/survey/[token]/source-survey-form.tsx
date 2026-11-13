"use client";

import * as React from "react";
import { CheckCircle2, Download, Printer } from "lucide-react";

import { submitSourceSurveyAction } from "@/app/modules/ed-review/actions";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioInput } from "@/components/ui/radio-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { getSourceSurveyDefinition } from "@/lib/ed-review/survey-source-content";
import type { EdReviewCampaignKind } from "@/lib/ed-review/domain";

import "./source-survey.css";

type SourceCampaign = {
  kind: EdReviewCampaignKind;
  title: string;
  organizationName: string;
  reviewYear: number;
  closesAt: string | null;
  brandPrimaryColor?: string;
};

type Draft = {
  idempotencyKey: string;
  meta: { period: string; deadline: string };
  ratings: Record<string, number>;
  comments: Record<string, string>;
  overall: { greatestStrength: string; importantChange: string; additionalComments: string };
  context: { sectorType: string; engagementLength: string; engagementNature: string };
};

function emptyDraft(period = "", deadline = ""): Draft {
  return {
    idempotencyKey: crypto.randomUUID(),
    meta: { period, deadline },
    ratings: {},
    comments: {},
    overall: { greatestStrength: "", importantChange: "", additionalComments: "" },
    context: { sectorType: "", engagementLength: "", engagementNature: "" },
  };
}

const copy = {
  "en-CA": {
    rated: (count: number, total: number) => `${count} of ${total} rated`,
    saving: "saving…",
    saved: "saved on this device",
    saveHint: "Your draft saves on this device as you go.",
    download: "Download",
    print: "Print / PDF",
    submit: "Submit survey",
    submitting: "Submitting…",
    noRating: "Please answer at least one rating before submitting.",
    unavailable: "This survey is no longer accepting responses. Your draft is still on this device; use Download for a copy.",
    changed: "This survey was updated. Download your draft, then reload before submitting.",
    failed: "Submission could not be completed. Please try again, or use Download as a backup.",
    optional: "optional",
    average: "Average",
    overallAverage: "Overall average",
    outOfFive: "out of 5",
    thankYou: "Thank you",
    submitted: "Your anonymous response was submitted. You may now close this window.",
    submittedAt: "Submitted",
    newResponse: "Start a new response",
    privacy: "Do not include names or contact details in comments. Responses are reviewed together.",
    downloadHint: "A JSON copy of this response will be saved to your device.",
    printHint: "Print or save this response as a PDF.",
    dateHint: "Use a year or YYYY–YYYY for the review period and YYYY-MM-DD for the reply-by date. The Board Chair controls when this survey actually closes.",
  },
  "fr-CA": {
    rated: (count: number, total: number) => `${count} évaluations sur ${total}`,
    saving: "enregistrement…",
    saved: "enregistré sur cet appareil",
    saveHint: "Votre brouillon s'enregistre au fur et à mesure sur cet appareil.",
    download: "Télécharger",
    print: "Imprimer / PDF",
    submit: "Soumettre le sondage",
    submitting: "Soumission…",
    noRating: "Répondez à au moins une évaluation avant de soumettre le sondage.",
    unavailable: "Ce sondage n'accepte plus de réponses. Votre brouillon est conservé sur cet appareil; téléchargez-en une copie.",
    changed: "Ce sondage a été mis à jour. Téléchargez votre brouillon, puis rechargez la page avant de le soumettre.",
    failed: "L'envoi n'a pas pu être effectué. Réessayez ou téléchargez une copie de sauvegarde.",
    optional: "facultatif",
    average: "Moyenne",
    overallAverage: "Moyenne générale",
    outOfFive: "sur 5",
    thankYou: "Merci",
    submitted: "Votre réponse anonyme a été soumise. Vous pouvez maintenant fermer cette fenêtre.",
    submittedAt: "Soumis le",
    newResponse: "Commencer une nouvelle réponse",
    privacy: "N'incluez pas de noms ni de coordonnées dans les commentaires. Les réponses sont examinées ensemble.",
    downloadHint: "Une copie JSON de cette réponse sera enregistrée sur votre appareil.",
    printHint: "Imprimez cette réponse ou enregistrez-la en PDF.",
    dateHint: "Indiquez une année ou AAAA–AAAA pour la période et AAAA-MM-JJ pour la date limite. La présidence du conseil détermine la date réelle de clôture.",
  },
} as const;

function average(values: number[]) {
  return values.length
    ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
    : "–";
}

function readableAccent(color: string) {
  const channel = (offset: number) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance <= 0.183 ? color : "#2F6E5B";
}

export function SourceSurveyForm({
  campaign,
  token,
  submitted,
  submittedAt,
}: {
  campaign: SourceCampaign;
  token: string;
  submitted: boolean;
  submittedAt?: string;
}) {
  const { locale } = useLocaleContext();
  const text = copy[locale];
  const definition = getSourceSurveyDefinition(campaign.kind, locale);
  const brandColor = campaign.brandPrimaryColor && /^#[0-9a-fA-F]{6}$/.test(campaign.brandPrimaryColor)
    ? campaign.brandPrimaryColor
    : "#2F6E5B";
  const inkColor = readableAccent(brandColor);
  const storageKey = `olea_ed_review_survey_v2_${token}`;
  const defaultPeriod = String(campaign.reviewYear);
  const defaultDeadline = campaign.closesAt?.slice(0, 10) ?? "";
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<"" | "saving" | "saved">("");
  const [error, setError] = React.useState("");
  const [submissionState, submitAction] = React.useActionState(submitSourceSurveyAction, { errorCode: "", revision: 0 });
  const submissionError = submissionState.errorCode === "unavailable"
    ? text.unavailable
    : submissionState.errorCode === "changed"
      ? text.changed
      : submissionState.errorCode
        ? text.failed
        : "";
  const total = definition.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answered = Object.values(draft?.ratings ?? {}).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5).length;

  React.useEffect(() => {
    if (submitted) {
      localStorage.removeItem(storageKey);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Partial<Draft> | null;
      if (saved && typeof saved.idempotencyKey === "string" && typeof saved.ratings === "object") {
        setDraft({
          idempotencyKey: saved.idempotencyKey,
          meta: { ...emptyDraft(defaultPeriod, defaultDeadline).meta, ...saved.meta },
          ratings: saved.ratings ?? {},
          comments: saved.comments ?? {},
          overall: { ...emptyDraft().overall, ...saved.overall },
          context: { ...emptyDraft().context, ...saved.context },
        });
        setSaveStatus("saved");
        return;
      }
    } catch { /* A corrupt local draft must not block the survey. */ }
    setDraft(emptyDraft(defaultPeriod, defaultDeadline));
  }, [storageKey, submitted, defaultPeriod, defaultDeadline]);

  React.useEffect(() => {
    if (!draft || submitted) return;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [draft, storageKey, submitted]);

  const saveLabel = saveStatus === "saved" ? text.saved : saveStatus === "saving" ? text.saving : text.saveHint;

  function updateRating(id: string, rating: number) {
    setError("");
    setDraft((current) => current ? { ...current, ratings: { ...current.ratings, [id]: rating } } : current);
  }

  function updateComment(id: string, value: string) {
    setDraft((current) => current ? { ...current, comments: { ...current.comments, [id]: value } } : current);
  }

  function download() {
    if (!draft) return;
    const store: Record<string, string> = {
      "meta.period": draft.meta.period,
      "meta.deadline": draft.meta.deadline,
    };
    if (campaign.kind === "partner") {
      store["about.role"] = draft.context.sectorType;
      store["about.length"] = draft.context.engagementLength;
      store["about.nature"] = draft.context.engagementNature;
    }
    for (const section of definition.sections) {
      for (const question of section.questions) {
        const rating = draft.ratings[question.id];
        if (rating) store[`rate.${question.sourceId}`] = String(rating);
      }
      store[`comment.${section.sourceId}`] = draft.comments[section.commentId] ?? "";
    }
    store["overall.strength"] = draft.overall.greatestStrength;
    store["overall.focus"] = draft.overall.importantChange;
    store["overall.other"] = draft.overall.additionalComments;
    const payload = { _type: `${campaign.kind}-survey`, savedAt: new Date().toISOString(), store };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = campaign.kind === "staff" ? "Staff-Feedback-Response.json" : "Partner-Feedback-Response.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (submitted) {
    const submittedStamp = submittedAt && Number.isFinite(Date.parse(submittedAt))
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(submittedAt))
      : "";
    return (
      <main className="source-survey min-h-screen p-4 md:p-8">
        <Card className="survey-card mx-auto mt-12 max-w-2xl text-center">
          <CardHeader className="items-center">
            <CheckCircle2 className="size-12 text-olea-green" aria-hidden="true" />
            <CardTitle className="text-3xl">{text.thankYou}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p>{text.submitted}</p>
            {submittedStamp ? <p className="text-sm text-[#726B60]">{text.submittedAt} {submittedStamp}</p> : null}
            <div className="flex justify-center"><LocaleSelector /></div>
            <Button type="button" variant="outline" onClick={() => { localStorage.removeItem(storageKey); window.location.assign(window.location.pathname); }}>
              {text.newResponse}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="source-survey min-h-screen pb-16 print:bg-white" style={{ "--survey-accent": inkColor, "--survey-brand": brandColor } as React.CSSProperties}>
      <div className="sticky top-0 z-20 border-b border-[#E5DDCF] bg-[#F6F2EB]/95 p-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center gap-2 px-[14px]">
          <div className="flex w-full items-center gap-2 sm:mr-auto sm:w-auto">
            <p className="flex-1 text-sm text-slate-700" role="status" aria-live="polite">
              {text.rated(answered, total)} · {saveLabel}
            </p>
            <LocaleSelector />
          </div>
          <div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto sm:gap-2">
          <Button type="button" variant="outline" className="px-2 text-xs sm:px-4 sm:text-sm" onClick={download} title={text.downloadHint} disabled={!draft}>
            <Download className="size-4" aria-hidden="true" />{text.download}
          </Button>
          <Button type="button" variant="outline" className="px-2 text-xs sm:px-4 sm:text-sm" onClick={() => window.print()} title={text.printHint}>
            <Printer className="size-4" aria-hidden="true" />{text.print}
          </Button>
          <Button type="submit" form="ed-source-survey-form" className="survey-primary px-2 text-xs sm:px-4 sm:text-sm" disabled={!draft}>
            {text.submit}
          </Button>
          </div>
        </div>
        {error || submissionError ? <p role="alert" className="mx-auto mt-2 max-w-4xl rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error || submissionError}</p> : null}
      </div>

      <form
        key={submissionState.revision}
        id="ed-source-survey-form"
        action={submitAction}
        className="mx-auto max-w-[820px] space-y-6 p-[26px]"
        onSubmit={(event) => {
          if (!answered) {
            event.preventDefault();
            setError(text.noRating);
          }
        }}
      >
        <Input type="hidden" name="token" value={token} />
        <Input type="hidden" name="instrumentVersion" value="2" />
        <Input type="hidden" name="idempotencyKey" value={draft?.idempotencyKey ?? ""} />
        <Input type="hidden" name="reviewPeriod" value={draft?.meta.period ?? ""} />
        <Input type="hidden" name="replyBy" value={draft?.meta.deadline ?? ""} />
        <Card className="survey-card overflow-hidden">
          <div className="h-2 bg-[var(--survey-brand)]" />
          <CardHeader className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--survey-accent)]">{definition.eyebrow}</p>
            <CardTitle className="text-3xl md:text-4xl">{definition.title}</CardTitle>
            <p className="text-lg font-semibold text-slate-700">{campaign.organizationName || definition.organizationPlaceholder}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="survey-period">{definition.reviewPeriodLabel}</Label>
                <Input id="survey-period" value={draft?.meta.period ?? ""} maxLength={9} pattern="[0-9]{4}([–-][0-9]{4})?" title={locale === "fr-CA" ? "AAAA ou AAAA–AAAA" : "YYYY or YYYY–YYYY"} aria-describedby="survey-meta-hint" placeholder={definition.reviewPeriodPlaceholder}
                  onChange={(event) => setDraft((current) => current ? { ...current, meta: { ...current.meta, period: event.target.value } } : current)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="survey-deadline">{definition.deadlineLabel}</Label>
                <Input id="survey-deadline" value={draft?.meta.deadline ?? ""} maxLength={10} pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" title="YYYY-MM-DD" aria-describedby="survey-meta-hint" placeholder="YYYY-MM-DD"
                  onChange={(event) => setDraft((current) => current ? { ...current, meta: { ...current.meta, deadline: event.target.value } } : current)} />
              </div>
            </div>
            <p id="survey-meta-hint" className="text-xs text-slate-500">{text.dateHint}</p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--survey-accent)]">
              {[definition.anonymousLabel, definition.durationLabel, definition.summaryLabel].map((label) => (
                <span className="rounded-full border border-[#E5DDCF] bg-[#F3F5F4] px-3 py-1" key={label}>{label}</span>
              ))}
            </div>
            <p className="leading-7 text-slate-700">{definition.description}</p>
            <p className="text-sm text-slate-600">{text.privacy}</p>
            {campaign.kind === "staff" ? (
              <div className="grid gap-2 border-t border-[#E5DDCF] pt-4 sm:grid-cols-5">
                {definition.ratingScale.map((rating) => (
                  <div key={rating.value} className="rounded-lg bg-[#F3F5F4] p-2 text-xs">
                    <p className="font-semibold">{rating.value} · {rating.label}</p>
                    <p className="text-[#726B60]">{rating.description}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardHeader>
        </Card>

        {campaign.kind === "partner" && definition.context ? (
          <Card className="survey-card">
            <CardHeader><CardTitle className="text-xl">{definition.context.title}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {([
                ["sectorType", "sectorTypeLabel", "sectorTypePlaceholder"],
                ["engagementLength", "lengthLabel", "lengthPlaceholder"],
                ["engagementNature", "natureLabel", "naturePlaceholder"],
              ] as const).map(([field, label, placeholder]) => (
                <div className="grid gap-2" key={field}>
                  <Label htmlFor={field}>{definition.context![label]} ({text.optional})</Label>
                  <Input id={field} name={field} value={draft?.context[field] ?? ""} maxLength={field === "engagementLength" ? 60 : 80}
                    placeholder={definition.context![placeholder]} aria-describedby={`${field}-hint`}
                    onChange={(event) => setDraft((current) => current ? { ...current, context: { ...current.context, [field]: event.target.value } } : current)} />
                  <p id={`${field}-hint`} className="text-xs text-slate-500">{definition.context![placeholder]}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {definition.sections.map((section) => {
          const sectionValues = section.questions.map((question) => draft?.ratings[question.id]).filter((value): value is number => typeof value === "number");
          return (
            <Card key={section.id} className="survey-card break-inside-avoid">
              <CardHeader className="border-b bg-slate-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--survey-accent)]">{section.sourceId}</p>
                    <CardTitle className="mt-1 text-2xl">{section.label}</CardTitle>
                    <p className="mt-2 text-sm text-slate-600">{section.description}</p>
                  </div>
                  <p className="shrink-0 text-center text-sm font-semibold text-[var(--survey-accent)]">{text.average}<br /><span className="text-2xl">{average(sectionValues)}</span></p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid gap-2 sm:grid-cols-5" aria-label={section.label}>
                  {definition.ratingScale.map((rating) => (
                    <div key={rating.value} className="rounded-md bg-slate-50 p-2 text-xs text-slate-700">
                      <span className="font-semibold">{rating.value} · {rating.label}</span>
                      <span className="ml-1">{rating.description}</span>
                    </div>
                  ))}
                </div>
                {section.questions.map((question) => (
                  <fieldset key={question.id} className="rounded-lg border p-4">
                    <legend className="px-1 font-semibold">{question.label}</legend>
                    <p className="mb-3 text-sm text-slate-600">{question.subtext}</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.label}>
                      {definition.ratingScale.map((rating) => (
                        <label key={rating.value} className="cursor-pointer">
                          <RadioInput name={`rating_${question.id}`} value={rating.value}
                            aria-label={`${rating.value} ${rating.label}: ${rating.description}`} checked={draft?.ratings[question.id] === rating.value}
                            onChange={() => updateRating(question.id, rating.value)} />
                          <span className="inline-flex size-11 items-center justify-center rounded-md border bg-white font-semibold transition peer-checked:border-[var(--survey-accent)] peer-checked:bg-[var(--survey-accent)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--survey-accent)]">{rating.value}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div className="grid gap-2">
                  <Label htmlFor={`comment_${section.commentId}`}>{section.commentPrompt} ({text.optional})</Label>
                  <Textarea id={`comment_${section.commentId}`} name={`comment_${section.commentId}`} maxLength={2000}
                    value={draft?.comments[section.commentId] ?? ""}
                    placeholder={definition.commentPlaceholder}
                    onChange={(event) => updateComment(section.commentId, event.target.value)} />
                  <p className="text-xs text-slate-500">{text.privacy}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="survey-card">
          <CardHeader><CardTitle className="text-2xl">{definition.overallTitle}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {([
              ["greatestStrength", definition.overallPrompts.greatestStrength],
              ["importantChange", definition.overallPrompts.importantChange],
              ["additionalComments", definition.overallPrompts.additionalComments],
            ] as const).map(([field, label]) => (
              <div className="grid gap-2" key={field}>
                <Label htmlFor={field}>{label} ({text.optional})</Label>
                <Textarea id={field} name={field} maxLength={2000} value={draft?.overall[field] ?? ""}
                  placeholder={label} onChange={(event) => setDraft((current) => current ? { ...current, overall: { ...current.overall, [field]: event.target.value } } : current)} />
              </div>
            ))}
            <div className="rounded-lg border border-olea-green/20 bg-olea-light/30 p-4 text-right">
              <p className="text-xs font-bold uppercase text-slate-600">{text.overallAverage}</p>
              <p className="text-3xl font-semibold text-[var(--survey-accent)]">{average(Object.values(draft?.ratings ?? {}))} <span className="text-sm text-slate-600">{text.outOfFive}</span></p>
            </div>
            <div className="rounded-lg border border-olea-green/20 bg-olea-light/30 p-4">
              <p className="font-semibold">{definition.closingTitle}</p>
              <p className="mt-1 text-sm text-slate-600">{definition.closingDescription}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 print:hidden">
              <p className="text-sm text-slate-600">{text.rated(answered, total)} · {saveLabel}</p>
              <SubmitButton className="survey-primary" pendingText={text.submitting}>{text.submit}</SubmitButton>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-500">{definition.footerNotice}</p>
      </form>
    </main>
  );
}
