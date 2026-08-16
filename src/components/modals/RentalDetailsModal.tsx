'use client';

import React from 'react';
import Link from 'next/link';
import SimpleModal from '@/components/modals/SimpleModal';
import { DetailFact, DetailFacts, DetailPanel, DetailSection, MoneyRow } from '@/components/modals/detail-layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/DataDisplay';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatCurrency } from '@/lib/currency';
import { calculateDuration, formatDateShort, formatDateTime } from '@/lib/date';
import { Rental } from '@/types';
import { Printer, ShoppingBag } from 'lucide-react';

interface RentalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  onEdit?: () => void;
  onActivate?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onInvoice?: () => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'primary' | 'default' | 'danger' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'overdue':
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function customerName(rental: Rental) {
  const name = `${rental.customer?.first_name || ''} ${rental.customer?.last_name || ''}`.trim();
  return name || `Rental #${rental.id.slice(-8)}`;
}

export function RentalDetailsModal({
  isOpen,
  onClose,
  rental,
  onEdit,
  onActivate,
  onComplete,
  onCancel,
  onInvoice,
}: RentalDetailsModalProps) {
  if (!rental) return null;

  const items = rental.items || [];
  const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);
  const refundable = (rental.security_deposit || 0) - (rental.damage_charges || 0);
  const deltaDays = Math.ceil((new Date(rental.return_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, deltaDays);
  const overdueDays = Math.max(0, -deltaDays);
  const canActivate = rental.status === 'pending' && Boolean(onActivate);
  const canComplete = (rental.status === 'active' || rental.status === 'overdue') && Boolean(onComplete);
  const canCancel = (rental.status === 'pending' || rental.status === 'active') && Boolean(onCancel);
  const primary = canActivate
    ? { label: 'Activate', onClick: onActivate }
    : canComplete
      ? { label: 'Complete', onClick: onComplete }
      : null;

  return (
    <SimpleModal
      isOpen={isOpen}
      title={customerName(rental)}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canCancel && (
            <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onInvoice && rental.status !== 'cancelled' && (
            <Button variant="secondary" onClick={onInvoice}>
              <Printer className="h-4 w-4" />
              Invoice
            </Button>
          )}
          {onEdit && !primary && (
            <Button variant="secondary" onClick={onEdit}>Edit</Button>
          )}
          {primary && (
            <Button onClick={primary.onClick}>{primary.label}</Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(rental.status)} dot className="capitalize">{rental.status}</Badge>
          {rental.status === 'active' && (
            <span className="text-sm text-slate-500">{remainingDays}d left</span>
          )}
          {rental.status === 'overdue' && (
            <span className="text-sm font-medium text-red-600">{overdueDays}d overdue</span>
          )}
        </div>

        {(rental.customer?.phone || rental.customer?.email || rental.customer?.branch || rental.branch) && (
          <DetailPanel>
            {(rental.customer?.phone || rental.customer?.email) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                {rental.customer?.phone}
                {rental.customer?.email && <span>· {rental.customer.email}</span>}
              </div>
            )}
            {(rental.customer?.branch || rental.branch) && (
              <div className={rental.customer?.phone || rental.customer?.email ? 'mt-2' : undefined}>
                <BranchBadge branch={rental.customer?.branch || rental.branch} always />
              </div>
            )}
          </DetailPanel>
        )}

        <DetailSection label="Schedule">
          <DetailPanel>
            <DetailFacts>
              <DetailFact label="Start" value={formatDateShort(rental.rental_date)} />
              <DetailFact label="Return" value={formatDateShort(rental.return_date)} />
              <DetailFact label="Duration" value={calculateDuration(rental.rental_date, rental.return_date)} />
              {rental.actual_pickup_date && (
                <DetailFact label="Picked up" value={formatDateTime(rental.actual_pickup_date)} />
              )}
              {rental.actual_return_date && (
                <DetailFact label="Returned" value={formatDateShort(rental.actual_return_date)} />
              )}
            </DetailFacts>
          </DetailPanel>
        </DetailSection>

        <DetailSection label="Items">
          <DetailPanel className="p-0">
            {items.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500">No items</div>
            ) : (
              <ul className="divide-y divide-black/5">
                {items.map((line) => (
                  <li key={line.id || `${line.item_id}-${line.quantity}`} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {line.item?.name || 'Item'}
                        {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {[line.item?.brand, line.item?.color, line.item?.size?.label].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm tabular-nums text-slate-700">
                      {formatCurrency(line.total_price || 0)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DetailPanel>
        </DetailSection>

        <DetailSection label="Payment">
          <DetailPanel className="space-y-2">
            <MoneyRow label="Rental" value={formatCurrency(rental.total_cost || 0)} />
            {(rental.late_fee || 0) > 0 && (
              <MoneyRow label="Late fee" value={`+${formatCurrency(rental.late_fee)}`} tone="danger" />
            )}
            {(rental.damage_charges || 0) > 0 && (
              <MoneyRow label="Damage" value={`+${formatCurrency(rental.damage_charges)}`} tone="danger" />
            )}
            <MoneyRow label="Total" value={formatCurrency(total)} tone="total" />
            {(rental.security_deposit || 0) > 0 && (
              <MoneyRow label="Deposit" value={formatCurrency(rental.security_deposit)} />
            )}
            {(rental.security_deposit || 0) > 0 && (
              <MoneyRow
                label="Refundable"
                value={formatCurrency(refundable)}
                tone={refundable >= 0 ? 'success' : 'danger'}
              />
            )}
          </DetailPanel>
        </DetailSection>

        {rental.identity_card_url && (
          <DetailSection label="Guarantee">
            <DetailPanel className="flex justify-center">
              <SafeImage
                src={rental.identity_card_url}
                alt="Identity card"
                width={280}
                height={180}
                className="max-h-40 w-auto rounded-xl object-contain"
                fallback={<p className="text-sm text-slate-500">Could not load ID photo</p>}
              />
            </DetailPanel>
          </DetailSection>
        )}

        {rental.notes?.trim() && (
          <DetailSection label="Notes">
            <DetailPanel>
              <p className="text-sm leading-relaxed text-slate-700">{rental.notes}</p>
            </DetailPanel>
          </DetailSection>
        )}

        {canComplete && (
          <Link
            href={`/dashboard/sales?rental_id=${rental.id}&customer_id=${rental.user_id}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700"
          >
            <ShoppingBag className="h-4 w-4" />
            Lost item or add-on sale
          </Link>
        )}
      </div>
    </SimpleModal>
  );
}
