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
    <div className={clsx('space-y-4 md:space-y-6 animate-slide-up', className)}>
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
      <div className="space-y-6">
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
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
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
// StatGrid — responsive row of KPI stat cards
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
  /** If true shows a pulse skeleton instead of value */
  loading?: boolean;
}

export function StatGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="glass-panel rounded-2xl p-4 flex flex-col gap-3"
        >
          {stat.icon && (
            <span className={clsx('inline-flex h-9 w-9 items-center justify-center rounded-lg', stat.iconBg ?? 'bg-indigo-50')}>
              <span className={clsx('h-4 w-4', stat.iconColor ?? 'text-indigo-600')}>
                {stat.icon}
              </span>
            </span>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500 truncate">{stat.label}</p>
            {stat.loading ? (
              <div className="mt-1 h-7 w-16 rounded-md bg-slate-100 animate-skeleton" />
            ) : (
              <p className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
            )}
            {stat.sub && !stat.loading && (
              <p className="mt-0.5 text-xs text-slate-400">{stat.sub}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
