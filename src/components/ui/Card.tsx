import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, padding = 'md', clickable = false, onClick }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const Component = clickable ? 'button' : 'div';

  return (
    <Component
      className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col',
        paddingClasses[padding],
        clickable && 'hover:shadow-md active:shadow-sm transition-shadow duration-200 touch-manipulation w-full text-left',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('border-b border-gray-200 pb-3 sm:pb-4 mb-3 sm:mb-4', className)}>
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
    sm: 'text-base sm:text-lg font-medium',
    md: 'text-lg sm:text-xl font-semibold',
    lg: 'text-xl sm:text-2xl font-bold',
  };

  return (
    <h3 className={clsx(sizeClasses[size], 'text-gray-900', className)}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={clsx('text-gray-600 flex-1', className)} suppressHydrationWarning>
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
    <div className={clsx('border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4', className)}>
      {children}
    </div>
  );
}