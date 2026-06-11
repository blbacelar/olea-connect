import { surveySections } from "@/lib/survey-content";

export function SurveyAdminSummary({
  averages,
  answers,
}: {
  averages: Array<{ id: string; title: string; average: number | null }>;
  answers: Record<number, unknown>;
}) {
  return (
    <div className="rounded-xl border bg-white px-6 py-5 shadow-soft">
      <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[11.5px] font-semibold text-orange-800">
        Admin only
      </span>
      <h2 className="mt-3.5 text-[21px] font-semibold">Results summary</h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">
        Section averages auto-calculate from completed ratings. Visible to
        administrators in the final PDF.
      </p>
      <div className="mt-5 overflow-hidden rounded-[10px] border">
        <div className="grid grid-cols-[1fr_90px_90px] border-b bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">
          <div className="px-4 py-3">Section</div>
          <div className="px-3 py-3 text-center">Answered</div>
          <div className="px-3 py-3 text-center">Average</div>
        </div>
        {averages.map((section, index) => {
          const answered = surveySections[index].questions.filter(
            (question) => answers[question.id] !== undefined,
          ).length;
          return (
            <div
              key={section.id}
              className="grid grid-cols-[1fr_90px_90px] items-center border-b border-slate-100 last:border-b-0"
            >
              <div className="px-4 py-3 text-[13.5px]">{section.title}</div>
              <div className="px-3 py-3 text-center font-mono text-[13px] text-slate-500">
                {answered}/{surveySections[index].questions.length}
              </div>
              <div className="px-3 py-3 text-center font-mono text-[15px] font-bold text-olea-dark">
                {section.average === null ? "—" : section.average.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
