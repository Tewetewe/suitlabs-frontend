'use client';

import React from 'react';
import SimpleModal from '@/components/modals/SimpleModal';
import { DetailFact, DetailFacts, DetailPanel, DetailSection, MoneyRow } from '@/components/modals/detail-layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/DataDisplay';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { formatPaymentMethod } from '@/lib/payment-methods';
import { occasionLabel } from '@/lib/select-options';
import { Booking } from '@/types';
import { CreditCard, FileText, Printer } from 'lucide-react';

interface BookingDetailsModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onEdit?: () => void;
  onInvoice?: (type: 'dp' | 'full') => void;
  onCollectBalance?: () => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'primary' | 'default' | 'danger' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending':
    case 'pending_approval':
      return 'warning';
    case 'active':
      return 'primary';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function paymentVariant(status: string): 'success' | 'warning' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'partial') return 'warning';
  return 'default';
}

function customerName(booking: Booking) {
  const name = `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim();
  return name || booking.full_name || 'Customer';
}

export function BookingDetailsModal({
  isOpen,
  booking,
  onClose,
  onEdit,
  onInvoice,
  onCollectBalance,
}: BookingDetailsModalProps) {
  if (!booking) return null;

  const items = booking.items || [];
  const hasPackage = Boolean(booking.package_pricing_id);
  const packagePrice = booking.package_pricing?.price || 0;
  const addonTotal = items.filter((item) => item.is_addon).reduce((sum, item) => sum + (item.final_price || item.total_price || 0), 0);
  const total = Math.max(0, (booking.total_amount || 0) - (booking.discount_amount || 0));
  const paid = booking.paid_amount || 0;
  const remaining = booking.remaining_amount ?? Math.max(0, total - paid);
  const canEdit = Boolean(onEdit) && booking.payment_status !== 'completed';
  const canCollect = Boolean(onCollectBalance) && booking.payment_status === 'partial' && remaining > 0;

  return (
    <SimpleModal
      isOpen={isOpen}
      title={customerName(booking)}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canEdit && !canCollect && (
            <Button variant="secondary" onClick={onEdit}>Edit</Button>
          )}
          {onInvoice && booking.status !== 'cancelled' && (
            <Button variant="secondary" onClick={() => onInvoice(booking.payment_status === 'pending' ? 'dp' : 'full')}>
              {booking.payment_status === 'pending' ? <FileText className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
              {booking.payment_status === 'pending' ? 'DP invoice' : 'Invoice'}
            </Button>
          )}
          {canCollect && (
            <Button onClick={onCollectBalance}>
              <CreditCard className="h-4 w-4" />
              Collect {formatCurrency(remaining)}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(booking.status)} dot className="capitalize">{booking.status.replace('_', ' ')}</Badge>
          <Badge variant={paymentVariant(booking.payment_status)} className="capitalize">
            {booking.payment_status === 'completed' ? 'Paid' : booking.payment_status === 'partial' ? 'Balance due' : 'Unpaid'}
          </Badge>
        </div>

        {(booking.customer?.phone || booking.phone_number || booking.customer?.email || booking.customer?.instagram || booking.customer?.tiktok || booking.customer?.branch || booking.branch) && (
          <DetailPanel>
            {(booking.customer?.phone || booking.phone_number || booking.customer?.email) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                {booking.customer?.phone || booking.phone_number}
                {booking.customer?.email && <span>· {booking.customer.email}</span>}
              </div>
            )}
            {(booking.customer?.instagram || booking.customer?.tiktok) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                {booking.customer?.instagram && <span>IG {booking.customer.instagram}</span>}
                {booking.customer?.instagram && booking.customer?.tiktok && <span>·</span>}
                {booking.customer?.tiktok && <span>TikTok {booking.customer.tiktok}</span>}
              </div>
            )}
            {(booking.customer?.branch || booking.branch) && (
              <div className={booking.customer?.phone || booking.phone_number || booking.customer?.email || booking.customer?.instagram || booking.customer?.tiktok ? 'mt-2' : undefined}>
                <BranchBadge branch={booking.customer?.branch || booking.branch} always />
              </div>
            )}
          </DetailPanel>
        )}

        <DetailSection label="Schedule">
          <DetailPanel>
            <DetailFacts>
              <DetailFact label="Booking" value={formatDateShort(booking.booking_date)} />
              <DetailFact
                label="Return"
                value={booking.appointment_date ? formatDateShort(booking.appointment_date) : '—'}
              />
              <DetailFact label="Guarantee" value={booking.booking_guarantee} />
              <DetailFact label="Occasion" value={occasionLabel(booking.institution)} />
              <DetailFact label="Method" value={formatPaymentMethod(booking.payment_method)} />
            </DetailFacts>
          </DetailPanel>
        </DetailSection>

        <DetailSection label="Items">
          <DetailPanel className="p-0">
            {hasPackage && (
              <div className="flex items-start justify-between gap-3 border-b border-black/5 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {booking.package_pricing?.package_name || 'Package'}
                  </div>
                  {booking.package_pricing?.duration_hours ? (
                    <div className="text-xs text-slate-500">{booking.package_pricing.duration_hours} hours</div>
                  ) : null}
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {formatCurrency(packagePrice)}
                </div>
              </div>
            )}
            {items.length === 0 && !hasPackage ? (
              <div className="px-3 py-3 text-sm text-slate-500">No items</div>
            ) : items.length > 0 ? (
              <ul className="divide-y divide-black/5">
                {items.map((line) => {
                  const showPrice = !hasPackage || line.is_addon;
                  return (
                    <li key={line.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {line.item?.name || 'Item'}
                          {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                        </div>
                        {line.is_addon && <div className="text-[11px] font-medium text-indigo-600">Add-on</div>}
                      </div>
                      {showPrice && (
                        <div className="shrink-0 text-sm tabular-nums text-slate-700">
                          {formatCurrency(line.final_price || line.total_price || 0)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </DetailPanel>
        </DetailSection>

        <DetailSection label="Payment">
          <DetailPanel className="space-y-2">
            {hasPackage && addonTotal > 0 && (
              <MoneyRow label="Add-ons" value={formatCurrency(addonTotal)} />
            )}
            {(booking.discount_amount || 0) > 0 && (
              <MoneyRow label="Discount" value={`−${formatCurrency(booking.discount_amount)}`} tone="muted" />
            )}
            <MoneyRow label="Total" value={formatCurrency(total)} tone="total" />
            <MoneyRow label="Paid" value={formatCurrency(paid)} />
            <MoneyRow
              label="Remaining"
              value={formatCurrency(remaining)}
              tone={remaining > 0 ? 'danger' : 'success'}
            />
          </DetailPanel>
        </DetailSection>

        {booking.notes?.trim() && (
          <DetailSection label="Notes">
            <DetailPanel>
              <p className="text-sm leading-relaxed text-slate-700">{booking.notes}</p>
            </DetailPanel>
          </DetailSection>
        )}
      </div>
    </SimpleModal>
  );
}
