import clsx from 'clsx';

/** Shared control chrome — 16px text so iOS/Android do not zoom on focus. */
export const CONTROL_CLASS =
  'block w-full rounded-xl border text-slate-900 glass-control placeholder:text-slate-400 text-base min-h-[44px] px-3 py-2.5 touch-manipulation focus:outline-none focus:ring-1 transition-colors';

export function controlBorderClass(error?: string) {
  return error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
    : 'border-black/10 focus:border-indigo-500/60 focus:ring-indigo-500/40';
}

export function fieldLabelClass(compact?: boolean) {
  return clsx('mb-1.5 block font-medium text-slate-700', compact ? 'text-xs' : 'text-sm');
}

export function isDecimalStep(step?: string | number) {
  if (step === 'any') return true;
  if (step == null || step === '') return false;
  const n = Number(step);
  return Number.isFinite(n) && n % 1 !== 0;
}

export function isNumericDraft(value: string, decimal: boolean) {
  if (value === '' || value === '-') return true;
  return decimal ? /^-?\d*[.,]?\d*$/.test(value) : /^-?\d*$/.test(value);
}
