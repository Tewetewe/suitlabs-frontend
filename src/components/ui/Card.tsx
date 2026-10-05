import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Card — white surface with ring border and subtle shadow
// ---------------------------------------------------------------------------

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

export function Card({ children, className, padding = 'sm', clickable = false, ...rest }: CardProps) {
  const paddingClasses = {
    none: '',
    sm:   'p-3 sm:p-4',
    md:   'p-4 sm:p-6',
    lg:   'p-6 sm:p-8',
  };

  return (
    <div
      className={clsx(
        'glass-panel min-w-0 overflow-hidden rounded-2xl flex flex-col',
        paddingClasses[padding],
        clickable && 'hover:shadow-md active:shadow-sm transition-all duration-150 touch-manipulation w-full text-left',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('border-b border-black/5 pb-3 sm:pb-4 mb-3 sm:mb-4', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CardTitle({ children, className, size = 'md' }: CardTitleProps) {
  const sizeClasses = {
    sm: 'text-sm  font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg  font-bold',
  };

  return (
    <h3 className={clsx(sizeClasses[size], 'text-slate-900 tracking-tight', className)}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardContent({ children, className, style }: CardContentProps) {
  return (
    <div className={clsx('text-slate-700 flex-1', className)} style={style} suppressHydrationWarning>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('border-t border-black/5 pt-3 sm:pt-4 mt-3 sm:mt-4', className)}>
      {children}
    </div>
  );
}