'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { TransactionFeeLines } from '@/components/payments/TransactionFeeLines';
import { POT_MISSING_MESSAGE, potForRequest, potMissing } from '@/lib/pots';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { formatCurrency } from '@/lib/currency';
import { feeMethodOf, TRANSACTION_FEE_HINT } from '@/lib/transaction-fee';
import { SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';
import { FEE_WAIVER_REASON_MIN, LateFeePreview, Rental } from '@/types';

/** Matches usecase.DepositReleaseGraceDays on the backend. */
export const DEPOSIT_GRACE_DAYS = 7;

export const isDepositHeld = (rental: Rental) =>
  Boolean(rental.deposit_collected_at) && !rental.deposit_refunded_at && (rental.security_deposit || 0) > 0;

interface CompleteRentalModalProps {
  isOpen: boolean;
  rental: Rental | null;
  onClose: () => void;
  /** Gets the Rental as the backend holds it after Complete. */
  onCompleted: (rental: Rental) => void;
  /** Starts the damage note, for example from the Return Check problems. */
  initialDamageNotes?: string;
  /**
   * The Items to send to maintenance when the box is ticked. Leave it empty to
   * send every rented Item, which is the Rentals page behaviour.
   */
  maintenanceItemIds?: string[];
}

export function CompleteRentalModal({
  isOpen,
  rental,
  onClose,
  onCompleted,
  initialDamageNotes = '',
  maintenanceItemIds,
}: CompleteRentalModalProps) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [damageCharges, setDamageCharges] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [chargePaymentMethod, setChargePaymentMethod] = useState('cash');
  const [chargeFeeRuleId, setChargeFeeRuleId] = useState('');
  const [chargePot, setChargePot] = useState('');
  const [actualReturnDate, setActualReturnDate] = useState('');
  const [sendToMaintenance, setSendToMaintenance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lateFee, setLateFee] = useState<LateFeePreview | null>(null);
  const [waiveLateFee, setWaiveLateFee] = useState(false);
  const [waivedAmount, setWaivedAmount] = useState(0);
  const [waiverReason, setWaiverReason] = useState('');

  const someItems = Boolean(maintenanceItemIds && maintenanceItemIds.length > 0);
  const isAdmin = user?.role === 'admin';
  const toIso = (local: string) => {
    if (!local) return undefined;
    const dt = new Date(local);
    return isNaN(dt.getTime()) ? undefined : dt.toISOString();
  };

  // Each open starts clean, with the note and the maintenance tick the caller
  // already knows about.
  useEffect(() => {
    if (!isOpen) return;
    setDamageCharges('');
    setDamageNotes(initialDamageNotes);
    setChargePaymentMethod('cash');
    setChargeFeeRuleId('');
    setChargePot('');
    setActualReturnDate('');
    setSendToMaintenance(someItems);
    setWaiveLateFee(false);
    setWaivedAmount(0);
    setWaiverReason('');
  }, [isOpen, rental?.id, initialDamageNotes, someItems]);

  // The backend prices the Late Fee. Ask it again when the return time
  // changes, so Admin sees what a waiver takes off.
  useEffect(() => {
    if (!isOpen || !rental) return;
    let cancelled = false;
    apiClient
      .previewLateFee(rental.id, toIso(actualReturnDate))
      .then((preview) => {
        if (cancelled) return;
        setLateFee(preview);
        setWaivedAmount((current) => Math.min(current || preview.late_fee, preview.late_fee));
      })
      .catch(() => {
        if (!cancelled) setLateFee(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, rental, actualReturnDate]);

  const fee = lateFee?.late_fee || 0;
  const waiverActive = isAdmin && waiveLateFee && fee > 0;
  const waiverInvalid =
    waiverActive && (waivedAmount <= 0 || waivedAmount > fee || waiverReason.trim().length < FEE_WAIVER_REASON_MIN);

  const submit = async () => {
    if (!rental) return;
    if (!user?.id) {
      toastError('Please sign in again', 'Your session expired.');
      return;
    }
    if (potMissing(chargePaymentMethod, chargePot)) {
      toastError('Pick the bank', POT_MISSING_MESSAGE);
      return;
    }
    if (waiverInvalid) {
      toastError('Check the Late Fee waiver', `Enter an amount up to ${formatCurrency(fee)} and a reason of at least ${FEE_WAIVER_REASON_MIN} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const parsedCharge = damageCharges ? parseFloat(damageCharges) : undefined;
      const isoActual = toIso(actualReturnDate);
      // A held deposit settles at the item check, so Complete sends no damage
      // charge and no refund. The backend refuses one anyway.
      const depositHeld = isDepositHeld(rental);
      await apiClient.completeRental(
        rental.id,
        user.id,
        isoActual,
        depositHeld ? undefined : parsedCharge,
        damageNotes || undefined,
        chargePaymentMethod,
        undefined,
        undefined,
        chargeFeeRuleId || undefined,
        potForRequest(chargePaymentMethod, chargePot),
        waiverActive ? { amount: waivedAmount, reason: waiverReason.trim() } : undefined,
      );
      if (sendToMaintenance && Array.isArray(rental.items)) {
        const only = someItems ? new Set(maintenanceItemIds) : null;
        for (const it of rental.items) {
          if (only && !only.has(it.item_id)) continue;
          try {
            await apiClient.sendToMaintenance(it.item_id, damageNotes || 'Maintenance after return', it.quantity || 1);
          } catch (e) {
            console.warn('Failed to send item to maintenance', it.item_id, e);
          }
        }
      }
      // Read the Rental back so the invoice shows the Late Fee and damage.
      let latest = rental;
      try {
        latest = await apiClient.getRental(rental.id);
      } catch {}
      onCompleted(latest);
    } catch (error) {
      console.error('Failed to complete rental:', error);
      toastError('Could not complete rental', apiErrorMessage(error, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen && Boolean(rental)}
      title="Complete rental"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} loading={submitting} disabled={waiverInvalid} data-testid="confirm-complete">Complete</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">If anything is missing, record lost items or add-ons first.</p>
        {rental && (
          <Link href={`/dashboard/sales?rental_id=${rental.id}&customer_id=${rental.user_id}`} className="inline-flex">
            <Button variant="secondary" size="sm"><ShoppingBag className="h-4 w-4" /> Lost items / add-ons</Button>
          </Link>
        )}
        {/* The time matters: each 20:00 after the Return Date adds a late day. */}
        <Input label="Actual return time" type="datetime-local" value={actualReturnDate} onChange={(e) => setActualReturnDate(e.target.value)} helperText="Leave empty to use now. Each 20:00 after the return date adds a late day." />
        {fee > 0 && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Late Fee {formatCurrency(fee)}
              {lateFee?.late_days ? ` · ${lateFee.late_days} late ${lateFee.late_days === 1 ? 'day' : 'days'} × 50% of the booking` : ''}
              {waiverActive && waivedAmount > 0 && waivedAmount <= fee ? ` · customer pays ${formatCurrency(fee - waivedAmount)}` : ''}
            </p>
            {isAdmin ? (
              <>
                <label className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4" checked={waiveLateFee} onChange={(e) => setWaiveLateFee(e.target.checked)} />
                  Waive the Late Fee, in full or in part
                </label>
                {waiveLateFee && (
                  <>
                    <CurrencyInput
                      label="Amount to waive"
                      value={waivedAmount ? String(waivedAmount) : ''}
                      onChange={(n) => setWaivedAmount(n || 0)}
                      helperText={`Up to ${formatCurrency(fee)}.`}
                    />
                    <Textarea
                      label="Reason"
                      rows={2}
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                      placeholder="For example: the flight was cancelled, ticket seen"
                      helperText={`At least ${FEE_WAIVER_REASON_MIN} characters. It stays on the Rental.`}
                    />
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-amber-800">Only Admin can waive the Late Fee.</p>
            )}
          </div>
        )}
        <Textarea label="Damage notes" rows={3} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Optional" />
        {rental && isDepositHeld(rental) ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-800">
              Deposit {formatCurrency(rental.security_deposit || 0)} stays held
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Check the item first, then tap <b>Release deposit</b> on this rental to charge damage and pay the rest back.
              If nobody checks it within {DEPOSIT_GRACE_DAYS} days, the whole deposit goes back automatically.
            </p>
          </div>
        ) : (
          <>
            <CurrencyInput label="Damage charge" value={damageCharges} onChange={(n) => setDamageCharges(n ? String(n) : '')} helperText="Leave 0 if none." />
            <Select searchable={false} label="Charges paid with" options={[...SALE_PAYMENT_METHOD_OPTIONS]} value={chargePaymentMethod} onChange={(e) => setChargePaymentMethod(e.target.value)} helperText={feeMethodOf(chargePaymentMethod) ? `Late fee and damage. ${TRANSACTION_FEE_HINT}` : 'Late fee and damage.'} />
            {/* The Late Fee is priced by the backend, so only the terminal choice shows here. */}
            <TransactionFeeLines amount={0} method={chargePaymentMethod} pot={chargePot} onPotChange={setChargePot} ruleId={chargeFeeRuleId} onRuleIdChange={setChargeFeeRuleId} className="text-xs text-slate-600" />
          </>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input id="send-maintenance" type="checkbox" className="h-4 w-4" checked={sendToMaintenance} onChange={(e) => setSendToMaintenance(e.target.checked)} />
          {someItems
            ? `Send ${maintenanceItemIds!.length} damaged ${maintenanceItemIds!.length === 1 ? 'item' : 'items'} to maintenance`
            : 'Send rented items to maintenance'}
        </label>
      </div>
    </SimpleModal>
  );
}
