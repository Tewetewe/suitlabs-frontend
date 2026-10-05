export default function DashboardLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded-lg bg-slate-200/80 animate-pulse" />
      <div className="h-4 w-72 max-w-full rounded bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
    </div>
  );
}
