'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useAnchoredMenu } from './anchored-menu';

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
// InfiniteScrollSentinel — load-more marker at the bottom of a list
// ---------------------------------------------------------------------------

export function InfiniteScrollSentinel({
  sentinelRef,
  loadingMore,
  hasMore,
  loaded,
  total,
}: {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  loadingMore: boolean;
  hasMore: boolean;
  loaded: number;
  total?: number;
}) {
  if (loaded === 0 && !loadingMore) return <div ref={sentinelRef} />;
  return (
    <div ref={sentinelRef} className="py-3 text-center text-sm text-slate-500">
      {loadingMore ? 'Loading more…' : hasMore ? null : total && total > loaded ? `${loaded} of ${total}` : `${loaded} shown`}
    </div>
  );
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
        'landscape:py-2 landscape:sm:py-2',
        '[&>*]:w-full sm:[&>*]:w-auto',
        // Make the primary free-text control (usually first) feel “full width”
        // on tablet/desktop as well, while keeping small selects compact.
        'sm:[&>*:first-child]:w-full sm:[&>*:first-child]:flex-1 sm:[&>*:first-child]:min-w-[280px]',
        'landscape:sm:[&>*:first-child]:min-w-0',
        'sm:[&>*:not(:first-child)]:min-w-[140px]',
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverflowMenu — collapse secondary row actions into a ⋯ menu
// ---------------------------------------------------------------------------

const OverflowMenuContext = createContext<{ close: () => void }>({ close: () => {} });

export function OverflowMenu({
  children,
  label = 'Actions',
  overlay = false,
}: {
  children: React.ReactNode;
  label?: string;
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const menuStyle = useAnchoredMenu(open, triggerRef, 320, 'end', 192);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menuId]);

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex h-8 w-8 items-center justify-center rounded-full',
          overlay
            ? 'bg-white/95 text-slate-700 shadow-sm ring-1 ring-black/10 backdrop-blur hover:bg-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <OverflowMenuContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            id={menuId}
            role="menu"
            style={menuStyle}
            className="overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/10"
          >
            {children}
          </div>
        </OverflowMenuContext.Provider>,
        document.body,
      )}
    </div>
  );
}

export function OverflowMenuItem({
  children,
  onClick,
  href,
  icon,
  danger = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  const { close } = useContext(OverflowMenuContext);
  const className = clsx(
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
    danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50',
  );

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    close();
    onClick?.();
  };

  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={handleClick}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={handleClick}>
      {icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// GroupedList — a two layer list: roll-up rows that open onto their own rows
//
// The top layer answers "how much and how many" for each group. The rows
// underneath answer "which ones", and only for the group the reader opens. It
// replaces a summary block sitting above a long flat table, where the reader has
// to match a number in one place against rows in another.
//
// Usage:
//   <GroupedList
//     label="Fixed assets by category"
//     openCount={openGroups.size}
//     groupCount={groups.length}
//     onExpandAll={expandAll}
//     onCollapseAll={collapseAll}
//   >
//     {groups.map((g) => (
//       <ListGroup
//         key={g.key}
//         title={g.title}
//         meta={`${g.rows.length} assets · ${g.units} units`}
//         value={formatCurrencyCompact(g.value)}
//         valueTitle={formatCurrency(g.value)}
//         open={openGroups.has(g.key)}
//         onToggle={() => toggleGroup(g.key)}
//       >
//         {g.rows.map((row) => <ListRow key={row.id} … />)}
//       </ListGroup>
//     ))}
//   </GroupedList>
// ---------------------------------------------------------------------------

export function GroupedList({
  label,
  openCount,
  groupCount,
  onExpandAll,
  onCollapseAll,
  children,
  className,
}: {
  /** Names the list for screen readers, e.g. "Fixed assets by category". */
  label: string;
  /** How many groups are open now, so the control offers the useful direction. */
  openCount?: number;
  groupCount?: number;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const showControl = Boolean(onExpandAll && onCollapseAll && (groupCount ?? 0) > 1);
  const allOpen = (openCount ?? 0) >= (groupCount ?? 0);

  return (
    <div className={clsx('space-y-2', className)}>
      {showControl && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={allOpen ? onCollapseAll : onExpandAll}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      )}
      <div role="group" aria-label={label} className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white/40">
        {children}
      </div>
    </div>
  );
}

export function ListGroup({
  title,
  meta,
  value,
  valueTitle,
  badge,
  open,
  onToggle,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** The count line under the title, e.g. "4 assets · 12 units". */
  meta?: string;
  /** The roll-up shown on the right, usually money. */
  value?: React.ReactNode;
  valueTitle?: string;
  badge?: React.ReactNode;
  /** Leave `open` and `onToggle` out to let the group hold its own state. */
  open?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : selfOpen;
  const bodyId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => (controlled ? onToggle?.() : setSelfOpen((prev) => !prev))}
        className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/70 sm:px-4"
      >
        <ChevronRight
          aria-hidden
          className={clsx('h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-90')}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
            {badge}
          </span>
          {meta && <span className="mt-0.5 block truncate text-xs text-slate-500">{meta}</span>}
        </span>
        {value != null && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900" title={valueTitle}>
            {value}
          </span>
        )}
      </button>
      {isOpen && (
        <div id={bodyId} className="divide-y divide-black/5 border-t border-black/5 bg-white/60">
          {children}
        </div>
      )}
    </div>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  value,
  valueTitle,
  actions,
  muted = false,
}: {
  title: React.ReactNode;
  /** Second line, e.g. the vendor or the product name. */
  subtitle?: React.ReactNode;
  /** Third line for the numbers that do not deserve a column. */
  meta?: React.ReactNode;
  value?: React.ReactNode;
  valueTitle?: string;
  actions?: React.ReactNode;
  /** Dims a row that no longer counts, such as a disposed asset. */
  muted?: boolean;
}) {
  return (
    <div className={clsx('flex items-start gap-3 px-3 py-2.5 sm:px-4', muted ? 'text-slate-400' : 'text-slate-800')}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
        {meta && <div className="mt-0.5 text-xs text-slate-500">{meta}</div>}
      </div>
      {value != null && (
        <div className="shrink-0 text-sm font-medium tabular-nums" title={valueTitle}>
          {value}
        </div>
      )}
      {actions}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CollapsibleCard — a page section that folds down to its headline
//
// A report page that stacks ten tables makes the reader scroll past nine of them
// to reach the tenth. Folded sections turn the page into an index: the header
// keeps the title, the one-line explanation and the number that matters, and the
// body opens when the reader asks for it.
//
// Usage:
//   <CollapsibleCard
//     title="Monthly Google Sheets export"
//     subtitle="Runs on the 1st, per shop."
//     summary={<Badge variant="success">3 completed</Badge>}
//     defaultOpen={false}
//   >
//     …
//   </CollapsibleCard>
// ---------------------------------------------------------------------------

export function CollapsibleCard({
  title,
  subtitle,
  summary,
  actions,
  open,
  onToggle,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** The headline the reader sees while the section is folded. */
  summary?: React.ReactNode;
  /** Buttons that belong to the section, kept out of the toggle. */
  actions?: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : selfOpen;
  const bodyId = useId();

  return (
    <div className={clsx('glass-panel min-w-0 overflow-hidden rounded-2xl', className)}>
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => (controlled ? onToggle?.() : setSelfOpen((prev) => !prev))}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-xl text-left hover:bg-white/50"
        >
          <ChevronRight
            aria-hidden
            className={clsx('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-90')}
          />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-slate-900">{title}</span>
            {subtitle && <span className="mt-0.5 block text-sm text-slate-600">{subtitle}</span>}
          </span>
          {summary != null && <span className="ml-auto shrink-0 pl-2 text-right">{summary}</span>}
        </button>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {isOpen && (
        <div id={bodyId} className="border-t border-black/5 p-3 sm:p-4">
          {children}
        </div>
      )}
    </div>
  );
}
