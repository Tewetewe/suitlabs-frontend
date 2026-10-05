import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// PageShell — the single wrapper every dashboard page uses.
//
// Usage:
//   <PageShell title="Bookings" subtitle="Manage reservations" action={<Button>New</Button>}>
//     {content}
//   </PageShell>
//
// For pages with multiple distinct sections use <PageSection> inside PageShell.
// ---------------------------------------------------------------------------

interface PageShellProps {
  /** Primary heading shown at the top of the page */
  title: string;
  /** Optional one-liner below the title */
  subtitle?: string;
  /** Slot for a primary CTA (usually a <Button>) — rendered top-right */
  action?: React.ReactNode;
  /** Extra controls beside the primary action (filters, view toggles, etc.) */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ title, subtitle, action, toolbar, children, className }: PageShellProps) {
  return (
    <div className={clsx('space-y-4 animate-slide-up', className)}>
      {/* Header row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 break-words">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">{subtitle}</p>
          )}
        </div>

        {(action || toolbar) && (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end shrink-0">
            {toolbar}
            {action}
          </div>
        )}
      </div>

      {/* Page body */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageSection — a titled sub-area within a page
// ---------------------------------------------------------------------------

interface PageSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ title, description, action, children, className }: PageSectionProps) {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatGrid — two-row KPI grid (2 cols on phones, 3 cols from tablet up)
// ---------------------------------------------------------------------------

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  /** Tailwind background color class for icon bg — e.g. 'bg-indigo-50' */
  iconBg?: string;
  /** Tailwind text color class for icon — e.g. 'text-indigo-600' */
  iconColor?: string;
  /** Small trend/sub-label below the value */
  sub?: string;
  /** Full value shown on hover when the visible value is truncated */
  title?: string;
  /** If true shows a pulse skeleton instead of value */
  loading?: boolean;
}

export function StatGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat, i) => {
        const valueText = String(stat.value ?? '');
        return (
          <div
            key={i}
            className="glass-panel min-w-0 overflow-hidden rounded-2xl px-3.5 py-3"
          >
            <div className="flex items-center gap-2">
              {stat.icon && (
                <span className={clsx('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md', stat.iconBg ?? 'bg-indigo-50')}>
                  <span className={clsx('[&>svg]:h-3.5 [&>svg]:w-3.5', stat.iconColor ?? 'text-indigo-600')}>
                    {stat.icon}
                  </span>
                </span>
              )}
              <p className="min-w-0 truncate text-xs font-medium text-slate-500">{stat.label}</p>
            </div>
            {stat.loading ? (
              <div className="mt-2 h-6 w-16 rounded-md bg-slate-100 animate-skeleton" />
            ) : (
              <p
                className="mt-2 truncate text-lg font-semibold tabular-nums tracking-tight text-slate-900"
                title={stat.title || valueText}
              >
                {stat.value}
              </p>
            )}
            {stat.sub && !stat.loading && (
              <p className="mt-0.5 truncate text-xs text-slate-400" title={stat.sub}>
                {stat.sub}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricTile — compact KPI used inside cards or as a light page row
// ---------------------------------------------------------------------------

interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  valueClassName?: string;
  title?: string;
  loading?: boolean;
}

export function MetricTile({ label, value, sub, icon, valueClassName, title, loading }: MetricTileProps) {
  const valueText = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  return (
    <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon && <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <div className="mt-1 h-6 w-20 rounded-md bg-slate-100 animate-skeleton" />
      ) : (
        <p
          className={clsx('mt-0.5 truncate text-base font-semibold tabular-nums tracking-tight text-slate-900', valueClassName)}
          title={title ?? valueText}
        >
          {value}
        </p>
      )}
      {sub != null && sub !== '' && !loading && (
        <p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>
      )}
    </div>
  );
}
