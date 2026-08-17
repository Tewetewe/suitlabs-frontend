'use client';

import ClientOnly from '@/components/ClientOnly';
import { CashierPOS } from '@/components/cashier/CashierPOS';

export default function CashierPage() {
  return (
    <ClientOnly
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
          Opening cashier…
        </div>
      }
    >
      <CashierPOS />
    </ClientOnly>
  );
}
