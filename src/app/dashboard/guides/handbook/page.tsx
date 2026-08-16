'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/DataDisplay';
import { GuideDocument } from '@/components/guides/GuideDocument';
import { OPERATIONS_HANDBOOK_HTML } from '@/content/guides/operations-handbook';
import { useAuth } from '@/contexts/AuthContext';

export default function OperationsHandbookPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // The handbook covers the books, buying prices and the month close — admin only.
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return; // DashboardLayout already redirects to login
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell
        title="Operations Handbook"
        subtitle="Admin only — the whole system: roles, the books, the spreadsheet, devices, and the month close."
      >
        {!isAdmin ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="Access denied"
                description="Only administrators can read the operations handbook."
              />
            </CardContent>
          </Card>
        ) : (
          <GuideDocument html={OPERATIONS_HANDBOOK_HTML} />
        )}
      </PageShell>
    </DashboardLayout>
  );
}
