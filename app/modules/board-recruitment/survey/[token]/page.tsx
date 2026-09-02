import type { Metadata } from "next";

import { submitPublicRecruitmentResponse } from "@/app/modules/board-recruitment/actions";
import { SurveyResponseSelect } from "@/app/modules/board-recruitment/survey-response-select";
import { Button } from "@/components/ui/button";
import { getPublicRecruitmentSurvey } from "@/lib/data/board-recruitment-survey";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

const surveyCopy: Record<
  Locale,
  {
    metadataTitle: string;
    metadataDescription: string;
    unavailableTitle: string;
    unavailableBody: string;
    thankYou: (memberName: string) => string;
    savedBody: (year: number) => string;
    eyebrow: (year: number) => string;
    instructions: (memberName: string) => string;
    expiresPrefix: string;
    submit: string;
  }
> = {
  "en-CA": {
    metadataTitle: "Board skills survey | Olea Connects™",
    metadataDescription:
      "Complete your organization's secure board skills survey.",
    unavailableTitle: "Survey link unavailable",
    unavailableBody:
      "This secure survey link has expired or is no longer active. Ask your board administrator to send a new invitation.",
    thankYou: (memberName) => `Thank you, ${memberName}`,
    savedBody: (year) =>
      `Your ${year} board skills survey response has been saved. You can close this window.`,
    eyebrow: (year) => `Board skills survey · ${year}`,
    instructions: (memberName) =>
      `Hi ${memberName}. Select Yes for skills you currently bring to the board. Select No for skills you do not currently hold.`,
    expiresPrefix: "This link expires",
    submit: "Submit survey",
  },
  "fr-CA": {
    metadataTitle: "Sondage sur les compétences du conseil | Olea Connects™",
    metadataDescription:
      "Remplissez le sondage sécurisé de votre organisme sur les compétences du conseil.",
    unavailableTitle: "Lien de sondage non disponible",
    unavailableBody:
      "Ce lien sécurisé de sondage a expiré ou n'est plus actif. Demandez à l'administrateur du conseil d'envoyer une nouvelle invitation.",
    thankYou: (memberName) => `Merci, ${memberName}`,
    savedBody: (year) =>
      `Votre réponse au sondage ${year} sur les compétences du conseil a été enregistrée. Vous pouvez fermer cette fenêtre.`,
    eyebrow: (year) => `Sondage sur les compétences du conseil · ${year}`,
    instructions: (memberName) =>
      `Bonjour ${memberName}. Sélectionnez Oui pour les compétences que vous apportez actuellement au conseil. Sélectionnez Non pour les compétences que vous ne détenez pas actuellement.`,
    expiresPrefix: "Ce lien expire le",
    submit: "Soumettre le sondage",
  },
};

export function generateMetadata(): Metadata {
  const copy = surveyCopy[getRequestLocale()];

  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
  };
}

export default async function BoardRecruitmentSurveyPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { submitted?: string };
}) {
  const locale = getRequestLocale();
  const copy = surveyCopy[locale];
  const survey = await getPublicRecruitmentSurvey(params.token);
  if (!survey) {
    return (
      <main className="mx-auto max-w-2xl p-6 md:p-12">
        <div className="rounded-2xl border bg-white p-8 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            Olea Connects™
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            {copy.unavailableTitle}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            {copy.unavailableBody}
          </p>
        </div>
      </main>
    );
  }

  if (searchParams?.submitted === "1" || survey.submitted) {
    return (
      <main className="mx-auto max-w-2xl p-6 md:p-12">
        <div className="rounded-2xl border bg-white p-8 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            {survey.organizationName}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            {copy.thankYou(survey.memberName)}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            {copy.savedBody(survey.surveyYear)}
          </p>
        </div>
      </main>
    );
  }

  const categories = [
    ...new Set(survey.skills.map((skill) => skill.categoryName)),
  ];
  const answers = Object.fromEntries(
    survey.skills.map((skill) => [
      skill.id,
      survey.responses.find((response) => response.skillId === skill.id)
        ?.hasSkill ?? false,
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border bg-white p-6 shadow-soft md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            {copy.eyebrow(survey.surveyYear)}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            {survey.organizationName}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            {copy.instructions(survey.memberName)}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {copy.expiresPrefix}{" "}
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Edmonton",
            }).format(new Date(survey.expiresAt))}
            .
          </p>
        </header>
        <form action={submitPublicRecruitmentResponse} className="space-y-6">
          <input type="hidden" name="token" value={survey.token} />
          {categories.map((category) => (
            <section
              key={category}
              className="rounded-2xl border bg-white p-6 shadow-soft"
            >
              <h2 className="text-xl font-bold text-slate-900">{category}</h2>
              <div className="mt-4 grid gap-3">
                {survey.skills
                  .filter((skill) => skill.categoryName === category)
                  .map((skill) => (
                    <label
                      key={skill.id}
                      className="flex items-center justify-between gap-4 rounded-xl border p-4"
                    >
                      <span className="font-medium text-slate-800">
                        {skill.name}
                      </span>
                      <SurveyResponseSelect
                        name={`skill-${skill.id}`}
                        label={`${skill.name} response`}
                        defaultValue={answers[skill.id] ? "true" : "false"}
                      />
                    </label>
                  ))}
              </div>
            </section>
          ))}
          <div className="flex justify-end">
            <Button type="submit">{copy.submit}</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
