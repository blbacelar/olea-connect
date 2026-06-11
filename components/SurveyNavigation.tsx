import { Check } from "lucide-react";

import { surveySections } from "@/lib/survey-content";
import type { TemplateSession } from "@/lib/types";
import { cn } from "@/lib/utils";

const items = [
  { label: "Header info", index: 0 },
  ...surveySections.map((section, index) => ({
    label: `Section ${index + 1}`,
    sublabel: section.title,
    index: index + 1,
  })),
  { label: "Open-ended", index: 9 },
  { label: "Admin summary", index: 10 },
];

export function SurveyNavigation({
  activeSection,
  session,
  completedCount,
  onSelect,
}: {
  activeSection: number;
  session: TemplateSession;
  completedCount: number;
  onSelect: (section: number) => void;
}) {
  const isComplete = (index: number) => {
    if (index === 0) return Boolean(session.boardYear && session.surveyPeriod);
    if (index >= 1 && index <= 8) {
      return surveySections[index - 1].questions.every(
        (question) => session.answers[question.id] !== undefined,
      );
    }
    if (index === 9) {
      return Object.values(session.openEndedAnswers).some(Boolean);
    }
    return false;
  };

  const progress = Math.round((completedCount / 38) * 100);

  return (
    <aside className="sticky top-0 w-full rounded-xl border bg-white p-3 shadow-soft lg:w-[236px] lg:shrink-0">
      <p className="px-3 pb-2 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        Sections
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = activeSection === item.index;
          const complete = isComplete(item.index);
          return (
            <button
              key={item.index}
              onClick={() => onSelect(item.index)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-slate-600 hover:bg-slate-100",
                active && "bg-olea-light font-semibold text-olea-dark",
              )}
            >
              <span
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full border-2",
                  complete
                    ? "border-olea-green bg-olea-green text-white"
                    : active
                      ? "border-slate-400"
                      : "border-slate-300",
                )}
              >
                {complete ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">{item.label}</span>
                {"sublabel" in item ? (
                  <span className="block truncate text-[11px] font-normal text-slate-400">
                    {item.sublabel}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 border-t border-slate-100 px-3 pb-1.5 pt-3">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-semibold text-olea-dark">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-olea-green transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
