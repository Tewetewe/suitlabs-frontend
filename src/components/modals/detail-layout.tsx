import React from 'react';
import clsx from 'clsx';

export function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h4>
      {children}
    </section>
  );
}

export function DetailPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx('rounded-2xl glass-panel p-3', className)}>{children}</div>;
}

export function DetailFacts({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}

export function DetailFact({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export function MoneyRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'muted' | 'danger' | 'success' | 'total';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={clsx(
          'text-sm',
          tone === 'total' ? 'font-semibold text-slate-900' : 'text-slate-500'
        )}
      >
        {label}
      </span>
      <span
        className={clsx(
          'tabular-nums text-sm',
          tone === 'total' && 'text-base font-semibold text-slate-900',
          tone === 'danger' && 'font-medium text-red-600',
          tone === 'success' && 'font-medium text-emerald-700',
          tone === 'muted' && 'text-slate-400',
          tone === 'default' && 'font-medium text-slate-900'
        )}
      >
        {value}
      </span>
    </div>
  );
}
