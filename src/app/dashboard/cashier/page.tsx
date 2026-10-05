'use client';

import { Store } from 'lucide-react';

import ClientOnly from '@/components/ClientOnly';
import { CashierPOS } from '@/components/cashier/CashierPOS';
import { Button } from '@/components/ui/Button';
import { useBranch } from '@/contexts/BranchContext';

// A sale or a booking belongs to one shop: its stock and its Cash Drawer. With
// all shops in the header, the cashier asks for one before it opens.
function PickShop() {
  const { allowedBranches, setCurrentBranchId } = useBranch();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center" data-testid="cashier-pick-shop">
      <Store className="h-10 w-10 text-slate-300" />
      <div>
        <p className="text-base font-semibold text-slate-900">Pick the shop you sell for</p>
        <p className="mt-1 text-sm text-slate-500">The cashier works for one shop at a time. The browser keeps your choice.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {allowedBranches.map((branch) => (
          <Button key={branch.id} onClick={() => setCurrentBranchId(branch.id)} data-testid={`cashier-shop-${branch.code}`}>
            {branch.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Cashier() {
  const { viewingAll, loading } = useBranch();
  if (loading) {
    return <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-slate-500">Opening cashier…</div>;
  }
  return viewingAll ? <PickShop /> : <CashierPOS />;
}

export default function CashierPage() {
  return (
    <ClientOnly
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
          Opening cashier…
        </div>
      }
    >
      <Cashier />
    </ClientOnly>
  );
}
