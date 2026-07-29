export default function TemplateLoading() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="rounded-xl border bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-11 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading template</span>
    </div>
  );
}
