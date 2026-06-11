import type {
  SurveyScore,
  SurveySectionData,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const scoreOptions: Array<{ value: SurveyScore; label: string }> = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: "na", label: "N/A" },
];

export function SurveySection({
  section,
  sectionNumber,
  answers,
  onScoreChange,
}: {
  section: SurveySectionData;
  sectionNumber: number;
  answers: Record<number, SurveyScore>;
  onScoreChange: (questionId: number, score: SurveyScore) => void;
}) {
  return (
    <div>
      <div className="mb-4 rounded-xl border bg-white px-6 py-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-olea-green">
          Section {sectionNumber}
        </p>
        <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.01em]">
          {section.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Rate the board&apos;s current effectiveness in this area using the
          scale below.
        </p>
        <div className="mt-[18px] flex justify-between border-t border-slate-100 pt-3.5 text-[11.5px] font-medium text-slate-400">
          <span>1 — Strongly disagree</span>
          <span>5 — Strongly agree</span>
        </div>
      </div>

      <div className="space-y-3">
        {section.questions.map((question) => (
          <fieldset
            key={question.id}
            className="rounded-xl border bg-white px-[22px] py-5 shadow-soft"
          >
            <legend className="float-left mb-4 w-full text-[15px] leading-6 text-slate-800">
              <span className="mr-1 font-semibold text-olea-green">
                {question.id}.
              </span>
              {question.text}
            </legend>
            <div className="clear-both flex flex-wrap gap-2">
              {scoreOptions.map((option) => {
                const selected = answers[question.id] === option.value;
                return (
                  <label
                    key={String(option.value)}
                    className={cn(
                      "grid h-[46px] cursor-pointer place-items-center rounded-[10px] border-[1.5px] text-sm font-semibold transition-colors",
                      option.value === "na" ? "w-[52px]" : "w-[46px]",
                      selected
                        ? "border-olea-green bg-olea-green text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-olea-green hover:text-olea-green",
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={String(option.value)}
                      checked={selected}
                      onChange={() => onScoreChange(question.id, option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
