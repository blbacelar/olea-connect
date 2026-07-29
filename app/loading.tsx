export default function AppLoading() {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-label="Loading workspace data"
    >
      <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-xl border bg-white shadow-soft"
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
