import React from 'react';
import clsx from 'clsx';

export function DetailSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      {label && <h4 className="text-sm font-semibold text-slate-900">{label}</h4>}
      {children}
    </section>
  );
}

export function DateRange({
  startLabel,
  start,
  endLabel,
  end,
  caption,
}: {
  startLabel: string;
  start: React.ReactNode;
  endLabel: string;
  end: React.ReactNode;
  caption?: React.ReactNode;
}) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{startLabel}</div>
          <div className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">{start}</div>
        </div>
        <div className="pb-1 text-slate-300" aria-hidden>
          →
        </div>
        <div className="min-w-0 text-right">
          <div className="text-xs text-slate-500">{endLabel}</div>
          <div className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">{end}</div>
        </div>
      </div>
      {caption ? <p className="mt-1.5 text-sm text-slate-500">{caption}</p> : null}
    </div>
  );
}

export function DetailHero({
  label,
  value,
  tone = 'default',
  caption,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
  caption?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={clsx(
          'mt-0.5 text-xl font-semibold tabular-nums tracking-tight',
          tone === 'danger' && 'text-red-600',
          tone === 'success' && 'text-emerald-700',
          tone === 'default' && 'text-slate-900'
        )}
      >
        {value}
      </div>
      {caption ? <p className="mt-1 text-sm text-slate-500">{caption}</p> : null}
    </div>
  );
}

export function DetailContact({
  phone,
  email,
  instagram,
  tiktok,
  extra,
}: {
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  extra?: React.ReactNode;
}) {
  if (!phone && !email && !instagram && !tiktok && !extra) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
      {phone && (
        <a href={`tel:${phone}`} className="hover:text-slate-900">
          {phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="hover:text-slate-900">
          {email}
        </a>
      )}
      {instagram && <span className="text-slate-400">IG {instagram}</span>}
      {tiktok && <span className="text-slate-400">TikTok {tiktok}</span>}
      {extra}
    </div>
  );
}

export function DetailMeta({ items }: { items: Array<string | null | undefined | false> }) {
  const shown = items.filter(Boolean) as string[];
  if (shown.length === 0) return null;
  return <p className="text-sm text-slate-500">{shown.join(' · ')}</p>;
}

export function DetailRows({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-black/5">{children}</dl>;
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function DetailList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-black/5">{children}</ul>;
}

export function DetailListItem({
  title,
  subtitle,
  trailing,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">{title}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
      {trailing != null && trailing !== '' ? (
        <div className="shrink-0 text-sm tabular-nums text-slate-700">{trailing}</div>
      ) : null}
    </li>
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
