'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { renderReceiptImage } from '@/lib/receipt-image';
import { receiptNumberProblem, receiptSendFailure } from '@/lib/wa-receipt';
import type { ReceiptKind } from '@/types';

export type ReceiptWhatsAppTarget = {
  kind: ReceiptKind;
  id: string;
  invoiceNumber: string;
  /** The phone on the customer record. A walk-in sale has none. */
  customerPhone?: string;
  /**
   * The customer of the receipt, so a fixed number can be saved on the
   * record. A booking invoice has none; its customer is read from the Booking.
   */
  customerId?: string;
  /**
   * Sends the receipt to the customer phone once, as soon as it is on screen.
   * Set it only right after a payment, not for a reprint.
   */
  autoSend?: boolean;
};

/**
 * Sends the receipt on screen to the customer's WhatsApp. With a phone on the
 * customer record, one tap sends it there. A number field opens in the
 * invoice footer, not as a pop-up, only when there is no number (a walk-in
 * sale) or when the send failed because of the number; Staff can then save
 * the fixed number on the customer. The backend still applies the opt-out and the resend cooldown.
 */
export function SendReceiptWhatsApp({ target }: { target: ReceiptWhatsAppTarget }) {
  const { success, warning, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [failure, setFailure] = useState('');
  const [saveToCustomer, setSaveToCustomer] = useState(true);
  const [customerId, setCustomerId] = useState(target.customerId || '');
  const [sending, setSending] = useState(false);
  const autoSent = useRef(false);

  const customerPhone = target.customerPhone?.trim() || '';

  // A booking invoice carries no customer id; read it once from the Booking.
  const resolveCustomerId = async (): Promise<string> => {
    if (customerId) return customerId;
    if (target.kind !== 'booking') return '';
    try {
      const booking = await apiClient.getBooking(target.id);
      const id = booking?.customer_id || '';
      setCustomerId(id);
      return id;
    } catch {
      return '';
    }
  };

  /** Sends to `overridePhone`, or to the customer record phone when it is empty. */
  const sendTo = async (overridePhone?: string, quiet = false): Promise<boolean> => {
    try {
      setSending(true);
      const image = await renderReceiptImage(`receipt_${target.invoiceNumber}.jpg`);
      await apiClient.sendReceiptWhatsApp(target.kind, target.id, image, overridePhone);
      success('Receipt sent', `WhatsApp to ${overridePhone || customerPhone}`);
      setOpen(false);
      return true;
    } catch (err) {
      const message = apiErrorMessage(err, 'Please try again.');
      switch (receiptSendFailure(message)) {
        case 'not_configured':
          // A shop without Wablas sends no receipts, so the auto-send says nothing.
          if (!quiet) toastError('WhatsApp is not set up', 'Wablas is not configured for this shop.');
          break;
        case 'opt_out':
          warning('Receipt not sent', 'The customer opted out of WhatsApp.');
          break;
        case 'cooldown':
          warning('Receipt already sent', 'It went to this number a moment ago. Wait 15 seconds to send it again.');
          break;
        case 'image':
          toastError('Could not send receipt', message);
          break;
        case 'package':
          // The Wablas account cannot send this message; a new number fixes nothing.
          toastError('Receipt not sent', "The shop's Wablas package does not allow image messages. The number is fine.");
          break;
        default:
          // Only a number problem opens the number field.
          setFailure(message);
          setPhone(overridePhone || customerPhone);
          setSaveToCustomer(true);
          setOpen(true);
          void resolveCustomerId();
      }
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // The ref keeps the send to one, also when React runs the effect twice in
    // development. There is no cleanup: Staff may close the modal while it sends.
    if (!target.autoSend || !customerPhone || autoSent.current) return;
    autoSent.current = true;
    // No phone override, so the backend sends to the customer record phone
    // and blocks a customer who opted out.
    void sendTo(undefined, true);
    // Send once for this receipt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.autoSend, target.kind, target.id, target.invoiceNumber, customerPhone]);

  const onButton = () => {
    if (customerPhone) {
      void sendTo();
      return;
    }
    setFailure('');
    setPhone('');
    setOpen(true);
    void resolveCustomerId();
  };

  const number = phone.trim();
  const changed = number !== customerPhone;
  const canSave = Boolean(customerId) && changed && number !== '';

  const sendFromField = async () => {
    if (!number) return;
    if (canSave && saveToCustomer) {
      try {
        setSending(true);
        await apiClient.updateCustomer(customerId, { phone: number });
      } catch (err) {
        setSending(false);
        toastError('Could not save the number', apiErrorMessage(err, 'Check the number and try again.'));
        return;
      }
      // The record now has the number, so the send goes to the record phone
      // and the opt-out still applies.
      await sendTo(undefined);
      return;
    }
    await sendTo(number);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={onButton}
        loading={sending && !open}
        disabled={sending || open}
        className="w-full sm:w-auto"
        data-testid="send-receipt-whatsapp"
      >
        <MessageCircle className="mr-1.5 h-4 w-4" />
        WhatsApp
      </Button>
      {open && (
        // A row in the invoice footer, not a pop-up over the invoice: on a
        // computer it sits above the buttons, and on a phone too (the footer
        // stacks in reverse there).
        <div
          className="order-last w-full basis-full rounded-xl bg-slate-50 p-3 text-left ring-1 ring-black/5 sm:order-first"
          data-testid="send-receipt-panel"
        >
          {failure && (
            <div className="mb-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-800 ring-1 ring-red-200" data-testid="send-receipt-failure">
              <p className="font-medium">The receipt did not send. {receiptNumberProblem(failure)}</p>
              <details className="mt-1 text-xs text-red-700/80">
                <summary className="cursor-pointer">Details</summary>
                <p className="mt-1 break-words">{failure}</p>
              </details>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <PhoneInput
                label={customerId ? 'Customer WhatsApp' : 'WhatsApp number'}
                value={phone}
                onChange={setPhone}
                helperText={customerId ? undefined : 'This receipt has no customer. Type the number to send it to.'}
              />
            </div>
            <div className="flex gap-2 sm:pb-0.5">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
              <Button onClick={() => void sendFromField()} loading={sending} disabled={!number} data-testid="send-receipt-confirm">
                {canSave && saveToCustomer ? 'Save and send' : 'Send'}
              </Button>
            </div>
          </div>
          {canSave && (
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={saveToCustomer}
                onChange={(e) => setSaveToCustomer(e.target.checked)}
                data-testid="send-receipt-save"
              />
              Save this number to the customer
            </label>
          )}
        </div>
      )}
    </>
  );
}

export default SendReceiptWhatsApp;
