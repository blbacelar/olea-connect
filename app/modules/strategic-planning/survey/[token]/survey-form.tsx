"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";

import { submitStakeholderSurvey, type SurveyActionState } from "@/app/modules/strategic-planning/survey/actions";
import { Button } from "@/components/ui/button";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { getPublicStakeholderSurvey } from "@/lib/data/strategic-stakeholder-surveys";
import { stakeholderAudiences, stakeholderThemes } from "@/lib/strategic-planning/stakeholder-survey";

type Survey = NonNullable<Awaited<ReturnType<typeof getPublicStakeholderSurvey>>>;
const idle: SurveyActionState = { status: "idle", message: "" };

function Submit({ showNotice }: { showNotice: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Submitting..." :
    showNotice ? "Submit anonymously" : "Submit response"}</Button>;
}

export function StakeholderSurveyForm({ token, survey }: { token: string; survey: Survey }) {
  const { locale } = useLocaleContext();
  const [state, action] = useFormState(submitStakeholderSurvey, idle);
  const [multi, setMulti] = useState<Record<string, string[]>>({});
  const minutes = Math.max(3, Math.ceil(survey.questions.reduce((sum, question) =>
    sum + (question.type === "open" ? 1.5 : 0.5), 0)));
  const defaultIntro = locale === "fr-CA" ?
    `${survey.organizationName} prépare un nouveau plan stratégique pour les ${survey.horizon} prochaines années. Nous aimerions savoir ce que nous faisons bien, ce que nous pourrions améliorer et où concentrer nos efforts. Le sondage prend environ ${minutes} minutes.` :
    `${survey.organizationName} is preparing a new strategic plan for the next ${survey.horizon} years. We would like to hear what we do well, what we could do better and where we should focus. The survey takes about ${minutes} minutes.`;
  if (state.status === "success") return <main className="mx-auto max-w-2xl px-4 py-12">
    <Card><CardContent className="space-y-4 p-8 text-center">
      <CheckCircle2 className="mx-auto size-10 text-olea-green" />
      <h1 className="text-2xl font-semibold">Thank you for your feedback</h1>
      <p>{survey.details?.anonymous !== false ? "Your response was submitted anonymously." : "Your response was submitted."}</p>
    </CardContent></Card>
  </main>;
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">Strategic planning survey</p>
      <h1 className="mt-2 text-3xl font-semibold">{survey.title}</h1>
      <p className="mt-2 text-sm text-slate-600">For {stakeholderAudiences.find((item) => item.v === survey.audience)?.l || "everyone"}.
        {survey.details?.anonymous !== false ? " Your answers have no name, email, or account attached." : ""} You may skip any question.</p>
      <p className="mt-3 whitespace-pre-wrap text-sm">{survey.details?.intro || defaultIntro}</p>
      {survey.details?.deadline ? <p className="mt-2 text-sm font-medium">Reply by {survey.details.deadline}</p> : null}
      {survey.details?.returnInstructions ? <p className="mt-2 text-sm">{survey.details.returnInstructions}</p> : null}
      {survey.details?.contact ? <p className="mt-2 text-sm">Questions? Contact {survey.details.contact}</p> : null}
    </div>
    <form action={action} className="space-y-5">
      <Input type="hidden" name="token" value={token} readOnly />
      {state.status === "error" ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</p> : null}
      {stakeholderThemes.map(([theme, heading]) => {
        const questions = survey.questions.filter((question) => question.theme === theme);
        if (!questions.length) return null;
        return <Card key={theme}><CardHeader><CardTitle>{heading}</CardTitle></CardHeader>
          <CardContent className="space-y-5">{questions.map((question, index) => <div key={question.id} className="space-y-2 border-t pt-4 first:border-0 first:pt-0">
            <label className="block text-sm font-medium" htmlFor={`answer-${question.id}`}>
              {index + 1}. {question.text}</label>
            {question.type === "open" ? <Textarea id={`answer-${question.id}`} name={`answer:${question.id}`}
              maxLength={2000} placeholder="Your answer, up to 2,000 characters" /> : null}
            {question.type === "agree" || question.type === "rating" ?
              <FormSelect id={`answer-${question.id}`} name={`answer:${question.id}`}
                ariaLabel={question.text} placeholder="Choose a rating from 1 to 5"
                options={[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) }))} /> : null}
            {question.type === "choice" ? <FormSelect id={`answer-${question.id}`}
              name={`answer:${question.id}`} ariaLabel={question.text} placeholder="Choose one option"
              options={question.options.map((option) => ({ value: option, label: option }))} /> : null}
            {question.type === "multi" ? <div className="space-y-2">
              <p className="text-xs text-slate-600">Choose up to three options.</p>
              {question.options.map((option) => <label key={option} className="flex items-center gap-2 text-sm">
                <Checkbox checked={(multi[question.id] ?? []).includes(option)}
                  disabled={(multi[question.id] ?? []).length >= 3 && !(multi[question.id] ?? []).includes(option)}
                  onChange={(event) => setMulti((current) => ({ ...current,
                    [question.id]: event.target.checked ? [...(current[question.id] ?? []), option] :
                      (current[question.id] ?? []).filter((value) => value !== option),
                  }))} />{option}
              </label>)}
              {(multi[question.id] ?? []).map((option) => <Input key={option} type="hidden"
                name={`answer:${question.id}`} value={option} readOnly />)}
            </div> : null}
          </div>)}</CardContent></Card>;
      })}
      <p className="text-sm text-slate-600">Answer at least one question. Ratings use 1 to 5, and multiple choice permits up to three selections.</p>
      <Submit showNotice={survey.details?.anonymous !== false} />
    </form>
  </main>;
}
