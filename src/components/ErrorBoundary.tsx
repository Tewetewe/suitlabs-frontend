'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-dvh items-center justify-center p-4">
          <div className="glass-panel-strong w-full max-w-md rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900">Something went wrong</h3>
            <p className="mt-1 text-sm text-slate-500">An error occurred while loading this page.</p>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-600">Error details</summary>
                <pre className="mt-2 overflow-auto rounded-xl bg-red-50 p-2 text-xs text-red-600">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
