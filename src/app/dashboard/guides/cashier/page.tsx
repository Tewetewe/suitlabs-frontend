'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';

import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/DataDisplay';
import { GuideDocument } from '@/components/guides/GuideDocument';
import { CASHIER_GUIDE_HTML } from '@/content/guides/cashier-guide';
import { useAuth } from '@/contexts/AuthContext';

export default function CashierGuidePage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Staff and admin both work the counter, so both may read this guide.
  const canRead = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return; // DashboardLayout already redirects to login
    if (!canRead) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, canRead, router]);

  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageShell
        title="Cashier Floor Guide"
        subtitle="How to run the counter: the POS, pickup, returns, and your shift routine."
      >
        {!canRead ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title="Access denied"
                description="This guide is for shop staff and administrators."
              />
            </CardContent>
          </Card>
        ) : (
          <GuideDocument html={CASHIER_GUIDE_HTML} />
        )}
      </PageShell>
    </>
  );
}
