import {
  Bell,
  BookOpen,
  CalendarDays,
  FileText,
  Gift,
  LayoutDashboard,
  Users,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FileText, label: "Templates" },
  { icon: CalendarDays, label: "Webinars" },
  { icon: Gift, label: "Olea Gives" },
  { icon: Users, label: "Community" },
];

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-6 -z-10 rounded-full bg-olea-light/80 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(31,41,55,0.16)]">
        <div className="flex h-10 items-center gap-1.5 border-b bg-slate-50 px-4">
          <span className="size-2.5 rounded-full bg-red-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 h-5 flex-1 rounded-md border bg-white" />
        </div>
        <div className="grid min-h-[410px] grid-cols-[132px_1fr] sm:grid-cols-[162px_1fr]">
          <aside className="bg-olea-dark p-3 text-white sm:p-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="grid size-7 place-items-center rounded-lg bg-white/15 text-xs font-bold">
                O
              </span>
              <span className="text-xs font-bold sm:text-sm">Olea Connects</span>
            </div>
            <nav className="mt-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-[10px] sm:text-xs ${
                      item.active
                        ? "bg-white text-olea-dark"
                        : "text-white/70"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </div>
                );
              })}
            </nav>
          </aside>
          <div className="min-w-0 bg-slate-50">
            <div className="flex h-12 items-center justify-between border-b bg-white px-4">
              <p className="text-xs font-semibold text-slate-600">
                JP Centre for Youth
              </p>
              <div className="flex items-center gap-2">
                <Bell className="size-3.5 text-slate-400" />
                <span className="grid size-7 place-items-center rounded-full bg-olea-light text-[9px] font-bold text-olea-dark">
                  SM
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-olea-green">
                Good morning, Sarah
              </p>
              <h3 className="mt-1 text-lg font-bold sm:text-xl">
                Your nonprofit home base
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border bg-white p-3">
                  <FileText className="size-4 text-olea-green" />
                  <p className="mt-3 text-xl font-bold">8</p>
                  <p className="text-[10px] text-slate-600">
                    Governance templates
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <BookOpen className="size-4 text-olea-orange" />
                  <p className="mt-3 text-xl font-bold">4</p>
                  <p className="text-[10px] text-slate-600">
                    Learning resources
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-olea-green p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-200">
                      Olea Gives Fund
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      Quarterly grant applications
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-white/70">
                      Simple, one-page applications for $500 capacity grants.
                    </p>
                  </div>
                  <Gift className="size-7 text-emerald-200" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border bg-white p-3">
                <div>
                  <p className="text-[10px] font-semibold">Brand profile</p>
                  <p className="text-[9px] text-slate-600">
                    Applied to every download
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="size-5 rounded-full bg-olea-green" />
                  <span className="size-5 rounded-full bg-olea-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-7 -left-3 hidden w-52 rounded-xl border bg-white p-3 shadow-xl sm:block">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-olea-green text-xs font-bold text-white">
            JP
          </span>
          <div>
            <p className="text-xs font-bold">Board Self-Evaluation</p>
            <p className="text-[10px] text-slate-600">Branded and ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}
