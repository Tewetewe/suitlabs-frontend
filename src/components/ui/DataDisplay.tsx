import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Badge — consistent status pill / chip
//
// Usage:
//   <Badge variant="success">Active</Badge>
//   <Badge variant="warning">Pending</Badge>
//   <Badge dot variant="danger">Overdue</Badge>
// ---------------------------------------------------------------------------

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-slate-100   text-slate-700   ring-slate-200',
  primary:  'bg-indigo-50   text-indigo-700  ring-indigo-200',
  success:  'bg-emerald-50  text-emerald-700 ring-emerald-200',
  warning:  'bg-amber-50    text-amber-700   ring-amber-200',
  danger:   'bg-red-50      text-red-700     ring-red-200',
  info:     'bg-sky-50      text-sky-700     ring-sky-200',
  purple:   'bg-purple-50   text-purple-700  ring-purple-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default:  'bg-slate-400',
  primary:  'bg-indigo-500',
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-red-500',
  info:     'bg-sky-500',
  purple:   'bg-purple-500',
};

export function Badge({ variant = 'default', dot = false, size = 'sm', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className={clsx('h-1.5 w-1.5 rounded-full', dotColors[variant])} aria-hidden />
      )}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — placeholder content while loading
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
  /** Renders multiple stacked rows */
  rows?: number;
}

export function Skeleton({ className, rows }: SkeletonProps) {
  if (rows) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-4 rounded-md bg-slate-100 animate-skeleton',
              i === rows - 1 ? 'w-3/4' : 'w-full',
              className
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('rounded-md bg-slate-100 animate-skeleton', className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 p-5 space-y-3 shadow-sm">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — shown when a list/table has no data
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <div className="mt-5">{action}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination — standardised prev/next + page indicator
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, perPage, onPageChange, className }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className={clsx('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-sm text-slate-500 shrink-0">
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </p>

      <div className="flex items-center gap-1 self-start sm:self-auto">
        <PageBtn
          label="← Prev"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        />

        <span className="px-1 text-xs text-slate-500 sm:hidden">{page}/{Math.max(1, totalPages)}</span>

        {/* Page pills — show up to 5 around current */}
        <div className="hidden items-center gap-1 sm:flex">
          {getPageRange(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={clsx(
                  'h-8 min-w-[2rem] rounded-lg px-2 text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        <PageBtn
          label="Next →"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        />
      </div>
    </div>
  );
}

function PageBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
    >
      {label}
    </button>
  );
}

function getPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

// ---------------------------------------------------------------------------
// FilterBar — a horizontal row of filter inputs / search
// ---------------------------------------------------------------------------

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      suppressHydrationWarning
      className={clsx(
        'flex flex-col items-stretch gap-2 rounded-2xl glass-panel px-3 py-3',
        'sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 sm:px-4',
        '[&>*]:w-full sm:[&>*]:w-auto',
        // Make the primary free-text control (usually first) feel “full width”
        // on tablet/desktop as well, while keeping small selects compact.
        'sm:[&>*:first-child]:w-full sm:[&>*:first-child]:flex-1 sm:[&>*:first-child]:min-w-[280px]',
        'sm:[&>*:not(:first-child)]:min-w-[140px]',
        className
      )}
    >
      {children}
    </div>
  );
}
