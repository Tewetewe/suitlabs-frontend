'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';

export default function FinancialReportPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

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

  if (!isAuthenticated || !isAdmin) {
    return (
      <DashboardLayout>
        <PageShell title="Financial Report" subtitle="Admin only">
          <Card>
            <CardContent>
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="Access denied"
                description="This page is only available to administrators."
              />
            </CardContent>
          </Card>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell title="Financial Report" subtitle="Placeholder page (admin only).">
        <Card>
          <CardContent>
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title="Coming soon"
              description="This will contain financial reporting."
            />
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
}

