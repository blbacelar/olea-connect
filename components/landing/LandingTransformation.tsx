import { ArrowRight, Clock3, FolderSearch, Palette } from "lucide-react";

import { Card } from "@/components/ui/card";

const problems = [
  {
    icon: Clock3,
    title: "Too much time rebuilding basics",
    text: "Board packages, policies, and governance documents should not start from a blank page.",
  },
  {
    icon: FolderSearch,
    title: "Advice scattered everywhere",
    text: "Resources, grant alerts, expert learning, and peer support live in too many disconnected places.",
  },
  {
    icon: Palette,
    title: "Templates that do not feel like yours",
    text: "Generic files still require hours of formatting before they are ready for your board.",
  },
];

export function LandingTransformation() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-olea-green">
              Built for stretched teams
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-[-0.03em] text-slate-900 md:text-4xl">
              Spend less time piecing support together.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Olea Connects brings the practical pieces of nonprofit operations
            into one welcoming home base, so your team can move from searching
            and formatting to making decisions and serving your community.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <div key={problem.title} className="contents">
                <Card className="h-full p-6 shadow-none">
                  <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-500">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{problem.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {problem.text}
                  </p>
                </Card>
                {index < problems.length - 1 ? (
                  <ArrowRight className="mx-auto hidden size-5 text-slate-300 lg:block" />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-6 rounded-2xl bg-[#183D2A] px-6 py-7 text-white md:flex md:items-center md:justify-between md:px-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
              The after
            </p>
            <p className="mt-2 text-xl font-bold">
              One login. Your brand. Practical support ready when you need it.
            </p>
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/70 md:mt-0">
            Download a board-ready document, join a webinar, find a funding
            lead, or ask your peers without leaving the Olea environment.
          </p>
        </div>
      </div>
    </section>
  );
}
