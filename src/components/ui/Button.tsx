import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Button — uses indigo primary, slate secondary
// ---------------------------------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none touch-manipulation select-none';

  const variants = {
    primary:   'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 active:to-indigo-800 shadow-sm shadow-indigo-600/20',
    secondary: 'glass-panel text-slate-900 hover:bg-white/75 active:bg-white/85',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
    ghost:     'text-slate-700 hover:bg-white/50 active:bg-white/70',
    outline:   'glass-panel text-slate-900 hover:bg-white/75 active:bg-white/85',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs  min-h-[32px]',
    md: 'px-4 py-2   text-sm  min-h-[38px]',
    lg: 'px-5 py-2.5 text-sm  min-h-[42px]',
    xl: 'px-6 py-3   text-base min-h-[48px]',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      suppressHydrationWarning
      {...props}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}