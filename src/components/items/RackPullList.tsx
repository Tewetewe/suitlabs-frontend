'use client';

import React from 'react';

export type RackPullItem = {
  name: string;
  code?: string;
  size?: string;
  quantity?: number;
};

export function RackPullList({
  items,
  label = 'Items to rent',
}: {
  items: RackPullItem[];
  label?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <ul className="mt-2 divide-y divide-black/5">
        {items.map((item, index) => {
          const qty = item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : '';
          const detail = [item.name, item.size].filter(Boolean).join(' · ');
          return (
            <li key={`${item.code || item.name}-${index}`} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold tracking-tight text-slate-900">
                  {item.code || '—'}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {detail}
                  {qty}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
