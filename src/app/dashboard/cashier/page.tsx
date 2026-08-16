'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CashierPOS } from '@/components/cashier/CashierPOS';

export default function CashierPage() {
  return (
    <DashboardLayout>
      <CashierPOS />
    </DashboardLayout>
  );
}
