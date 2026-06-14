"use client";

import dynamic from "next/dynamic";
import { Check, FileDown, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { SurveyAdminSummary } from "@/components/SurveyAdminSummary";
import { SurveyNavigation } from "@/components/SurveyNavigation";
import { SurveySection } from "@/components/SurveySection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSurveySession } from "@/hooks/use-survey-session";
import { openEndedQuestions, surveySections } from "@/lib/survey-content";
import type { Organization, TemplateSession } from "@/lib/types";

import { saveTemplateSession } from "./actions";
const PdfPanel = dynamic(() => import("@/components/PdfPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-96 place-items-center rounded-xl border bg-white">
      <LoaderCircle className="size-7 animate-spin text-olea-green" />
    </div>
  ),
});

export function BoardEvaluationEditor({
  initialSession,
  organization,
}: {
  initialSession: TemplateSession;
  organization: Organization;
}) {
  const {
    session,
    updateField,
    updateScore,
    updateOpenAnswer,
    sectionAverages,
    completedCount,
  } = useSurveySession(initialSession);
  const [activeSection, setActiveSection] = useState(0);
  const [showPdf, setShowPdf] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();

  const generatePdf = () => {
    startTransition(async () => {
      try {
        await saveTemplateSession(session);
        setSaveError("");
        setShowPdf(true);
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Unable to save this template.",
        );
      }
    });
  };

  if (showPdf) {
    return (
      <div>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">
              Board Self-Evaluation
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Branded PDF preview
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowPdf(false)}>
            Back to editor
          </Button>
        </div>
        <PdfPanel organization={organization} session={session} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            Board Self-Evaluation
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Annual Survey Template · 38 rated questions · {completedCount}{" "}
            answered
          </p>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
            <Check className="size-4 text-olea-green" />
            Saved just now
          </span>
          <Button onClick={generatePdf} disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <SurveyNavigation
          activeSection={activeSection}
          session={session}
          completedCount={completedCount}
          onSelect={setActiveSection}
        />

        <div className="min-w-0 flex-1">
          {activeSection === 0 ? (
            <div className="rounded-xl border bg-white p-7 shadow-soft">
              <h2 className="text-xl font-semibold">Header information</h2>
              <p className="mb-6 mt-1.5 text-sm leading-6 text-slate-500">
                These details appear on the cover page of your branded PDF.
              </p>
              <div className="max-w-[360px] space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="boardYear">
                    Board year <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="boardYear"
                    value={session.boardYear}
                    onChange={(event) =>
                      updateField("boardYear", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surveyPeriod">
                    Survey period <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="surveyPeriod"
                    value={session.surveyPeriod}
                    onChange={(event) =>
                      updateField("surveyPeriod", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeSection >= 1 && activeSection <= 8 ? (
            <SurveySection
              section={surveySections[activeSection - 1]}
              sectionNumber={activeSection}
              answers={session.answers}
              onScoreChange={updateScore}
            />
          ) : null}

          {activeSection === 9 ? (
            <div>
              <div className="mb-4 rounded-xl border bg-white px-6 py-5 shadow-soft">
                <h2 className="text-[21px] font-semibold">
                  Open-ended reflections
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Share qualitative feedback. Write as much or as little as is
                  useful.
                </p>
              </div>
              <div className="space-y-4">
                {openEndedQuestions.map((question, index) => {
                  const value = session.openEndedAnswers[question.id] ?? "";
                  return (
                    <div
                      key={question.id}
                      className="rounded-xl border bg-white px-[22px] py-5 shadow-soft"
                    >
                      <Label
                        htmlFor={question.id}
                        className="text-[15px] font-normal leading-6"
                      >
                        <span className="font-semibold text-olea-green">
                          {index + 1}.
                        </span>{" "}
                        {question.text}
                      </Label>
                      <Textarea
                        id={question.id}
                        className="mt-3"
                        value={value}
                        onChange={(event) =>
                          updateOpenAnswer(question.id, event.target.value)
                        }
                      />
                      <p className="mt-1.5 text-right text-xs text-slate-400">
                        {value.length} characters
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeSection === 10 ? (
            <SurveyAdminSummary
              averages={sectionAverages}
              answers={session.answers}
            />
          ) : null}

          <div className="mt-[22px] flex justify-between">
            <Button
              variant="outline"
              disabled={activeSection === 0}
              onClick={() =>
                setActiveSection((current) => Math.max(0, current - 1))
              }
            >
              ← Previous section
            </Button>
            <Button
              variant="outline"
              className="border-olea-green text-olea-green hover:bg-olea-light"
              disabled={activeSection === 10}
              onClick={() =>
                setActiveSection((current) => Math.min(10, current + 1))
              }
            >
              Next section →
            </Button>
          </div>
        </div>
      </div>
      {saveError ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
