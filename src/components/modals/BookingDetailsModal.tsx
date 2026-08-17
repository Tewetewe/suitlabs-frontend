'use client';

import React from 'react';
import Link from 'next/link';
import SimpleModal from '@/components/modals/SimpleModal';
import {
  DateRange,
  DetailContact,
  DetailHero,
  DetailList,
  DetailListItem,
  DetailMeta,
  DetailSection,
  MoneyRow,
} from '@/components/modals/detail-layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/DataDisplay';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { formatPaymentMethod } from '@/lib/payment-methods';
import { occasionLabel } from '@/lib/select-options';
import { Booking } from '@/types';
import { CreditCard, FileText, Printer, ShoppingBag } from 'lucide-react';

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
          <Badge variant={paymentVariant(booking.payment_status)}>
            {booking.payment_status === 'completed' ? 'Paid' : booking.payment_status === 'partial' ? 'Balance due' : 'Unpaid'}
          </Badge>
          <BranchBadge branch={booking.customer?.branch || booking.branch} always />
        </div>

        {booking.rental?.status === 'pending' && (
          <Link
            href="/dashboard/rentals"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700"
          >
            <ShoppingBag className="h-4 w-4" />
            Ready for pickup on Rentals
          </Link>
        )}
        {booking.rental?.status === 'active' && (
          <p className="text-sm text-slate-500">Out on rental</p>
        )}

        <DateRange
          startLabel="Booking"
          start={formatDateShort(booking.booking_date)}
          endLabel="Return"
          end={booking.appointment_date ? formatDateShort(booking.appointment_date) : '—'}
        />

        {remaining > 0 ? (
          <DetailHero
            label="Balance due"
            value={formatCurrency(remaining)}
            tone="danger"
            caption={paid > 0 ? `${formatCurrency(paid)} already paid` : 'Nothing paid yet'}
          />
        ) : booking.payment_status === 'completed' ? (
          <DetailHero label="Paid" value={formatCurrency(total)} tone="success" />
        ) : null}

        <DetailContact
          phone={booking.customer?.phone || booking.phone_number}
          email={booking.customer?.email}
          instagram={booking.customer?.instagram}
          tiktok={booking.customer?.tiktok}
        />

        <DetailSection label="Items">
          {items.length === 0 && !hasPackage ? (
            <p className="text-sm text-slate-500">No items</p>
          ) : (
            <DetailList>
              {hasPackage && (
                <DetailListItem
                  title={booking.package_pricing?.package_name || 'Package'}
                  subtitle={booking.package_pricing?.duration_hours ? `${booking.package_pricing.duration_hours} hours` : undefined}
                  trailing={formatCurrency(packagePrice)}
                />
              )}
              {items.map((line) => {
                const showPrice = !hasPackage || line.is_addon;
                return (
                  <DetailListItem
                    key={line.id}
                    title={`${line.item?.name || 'Item'}${line.quantity > 1 ? ` ×${line.quantity}` : ''}`}
                    subtitle={[line.item?.code, line.is_addon ? 'Add-on' : null].filter(Boolean).join(' · ') || undefined}
                    trailing={showPrice ? formatCurrency(line.final_price || line.total_price || 0) : undefined}
                  />
                );
              })}
            </DetailList>
          )}
        </DetailSection>

        <DetailSection label="Payment">
          <div className="space-y-2">
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
          </div>
        </DetailSection>

        <DetailMeta
          items={[
            booking.institution ? occasionLabel(booking.institution) : null,
            booking.booking_guarantee,
            booking.payment_method ? formatPaymentMethod(booking.payment_method) : null,
          ]}
        />

        {booking.notes?.trim() && (
          <DetailSection label="Notes">
            <p className="text-sm leading-relaxed text-slate-700">{booking.notes}</p>
          </DetailSection>
        )}
      </div>
    </SimpleModal>
  );
}
