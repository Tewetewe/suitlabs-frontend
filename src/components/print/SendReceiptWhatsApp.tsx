'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import SimpleModal from '@/components/modals/SimpleModal';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { renderReceiptImage } from '@/lib/receipt-image';
import type { ReceiptKind } from '@/types';

export type ReceiptWhatsAppTarget = {
  kind: ReceiptKind;
  id: string;
  invoiceNumber: string;
  /** The phone on the customer record. A walk-in sale has none. */
  customerPhone?: string;
  /**
   * Sends the receipt to the customer phone once, as soon as it is on screen.
   * Set it only right after a payment, not for a reprint.
   */
  autoSend?: boolean;
};

/**
 * Sends the receipt on screen to the customer's WhatsApp. Staff confirm the
 * number first, because a receipt sent to the wrong number cannot be recalled.
 * After a payment, `autoSend` sends it to the customer record phone without the
 * dialog. The backend still applies the opt-out and the resend cooldown.
 */
export function SendReceiptWhatsApp({ target }: { target: ReceiptWhatsAppTarget }) {
  const { success, warning, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const autoSent = useRef(false);

  const customerPhone = target.customerPhone?.trim() || '';
  useEffect(() => {
    // The ref keeps the send to one, also when React runs the effect twice in
    // development. There is no cleanup: Staff may close the modal while it sends.
    if (!target.autoSend || !customerPhone || autoSent.current) return;
    autoSent.current = true;
    void (async () => {
      try {
        setSending(true);
        // The render copies the receipt before its first await, so the send
        // still works after the modal closes.
        const image = await renderReceiptImage(`receipt_${target.invoiceNumber}.jpg`);
        // No phone override, so the backend sends to the customer record phone
        // and blocks a customer who opted out.
        await apiClient.sendReceiptWhatsApp(target.kind, target.id, image);
        success('Receipt sent', `WhatsApp to ${customerPhone}`);
      } catch (err) {
        const message = apiErrorMessage(err, 'Send it with the WhatsApp button.');
        // A shop without Wablas sends no receipts, so it gets no toast on every payment.
        if (message.includes('WABLAS_NOT_CONFIGURED')) return;
        if (message.includes('CUSTOMER_WA_OPT_OUT')) {
          warning('Receipt not sent', 'The customer opted out of WhatsApp.');
          return;
        }
        toastError('Could not send receipt', message);
      } finally {
        setSending(false);
      }
    })();
    // Send once for this receipt. The toast functions are not stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.autoSend, target.kind, target.id, target.invoiceNumber, customerPhone]);

  const openDialog = () => {
    setPhone(target.customerPhone || '');
    setOpen(true);
  };

  const send = async () => {
    if (!phone.trim()) return;
    try {
      setSending(true);
      const image = await renderReceiptImage(`receipt_${target.invoiceNumber}.jpg`);
      await apiClient.sendReceiptWhatsApp(target.kind, target.id, image, phone.trim());
      success('Receipt sent', `WhatsApp to ${phone.trim()}`);
      setOpen(false);
    } catch (err) {
      toastError('Could not send receipt', apiErrorMessage(err, 'Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={openDialog}
        loading={sending && !open}
        disabled={sending}
        className="w-full sm:w-auto"
        data-testid="send-receipt-whatsapp"
      >
        <MessageCircle className="mr-1.5 h-4 w-4" />
        WhatsApp
      </Button>
      <SimpleModal
        isOpen={open}
        title="Send receipt to WhatsApp"
        onClose={() => setOpen(false)}
        size="sm"
        nested
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button onClick={send} loading={sending} disabled={!phone.trim()}>Send</Button>
          </div>
        }
      >
        <Input
          label="WhatsApp number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="0812…"
          helperText={
            target.customerPhone
              ? 'The customer phone is filled in. Change it only if the customer asks.'
              : 'This receipt has no customer. Type the number to send it to.'
          }
        />
      </SimpleModal>
    </>
  );
}

export default SendReceiptWhatsApp;
