'use client';

import clsx from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left touch-manipulation',
        'ring-1 ring-black/10 bg-white',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <span
        className={clsx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-indigo-600' : 'bg-slate-200',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
