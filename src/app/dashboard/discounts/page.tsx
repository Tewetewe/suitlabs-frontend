'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DiscountManagement } from '@/components/features/DiscountManagement';

export default function DiscountsPage() {
  return (
    <DashboardLayout>
      <DiscountManagement />
    </DashboardLayout>
  );
}