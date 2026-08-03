import type { Metadata } from "next";

import { submitPublicRecruitmentResponse } from "@/app/modules/board-recruitment/actions";
import { SurveyResponseSelect } from "@/app/modules/board-recruitment/survey-response-select";
import { getPublicRecruitmentSurvey } from "@/lib/data/board-recruitment-survey";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Board skills survey | Olea Connects™",
  description: "Complete your organization's secure board skills survey.",
};

export default async function BoardRecruitmentSurveyPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { submitted?: string };
}) {
  const survey = await getPublicRecruitmentSurvey(params.token);
  if (!survey) {
    return (
      <main className="mx-auto max-w-2xl p-6 md:p-12">
        <div className="rounded-2xl border bg-white p-8 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            Olea Connects™
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Survey link unavailable
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            This secure survey link has expired or is no longer active. Ask your
            board administrator to send a new invitation.
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
            Thank you, {survey.memberName}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Your {survey.surveyYear} board skills survey response has been
            saved. You can close this window.
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
            Board skills survey · {survey.surveyYear}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            {survey.organizationName}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Hi {survey.memberName}. Select Yes for skills you currently bring to
            the board. Select No for skills you do not currently hold.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            This link expires{" "}
            {new Intl.DateTimeFormat("en-CA", {
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
            <button
              type="submit"
              className="rounded-md bg-olea-orange px-5 py-3 font-semibold text-slate-900"
            >
              Submit survey
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
