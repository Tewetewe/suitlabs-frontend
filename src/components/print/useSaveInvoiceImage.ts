'use client';

import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { renderReceiptImage } from '@/lib/receipt-image';
import type { ReceiptKind } from '@/types';

/** Lets the modal finish its layout before the receipt is drawn. */
const SAVE_DELAY_MS = 600;

/**
 * Saves the invoice image on screen once, when a Booking or Rental invoice
 * opens. Nothing goes to WhatsApp. The pickup and return reminders attach the
 * newest saved image, so Staff do not have to send the receipt first.
 *
 * A failed save is silent: the reminder then goes out as text only.
 */
export function useSaveInvoiceImage(target?: { kind: ReceiptKind; id: string; invoiceNumber: string }) {
  const savedKey = useRef('');
  const kind = target?.kind;
  const id = target?.id;
  const invoiceNumber = target?.invoiceNumber;

  useEffect(() => {
    // A Sale has no reminder.
    if (!kind || !id || kind === 'sale') return;
    const key = `${kind}:${id}`;
    // The ref keeps it to one save per invoice, also when React runs the
    // effect twice in development.
    if (savedKey.current === key) return;
    savedKey.current = key;

    window.setTimeout(() => {
      void (async () => {
        try {
          const image = await renderReceiptImage(`invoice_${invoiceNumber || id}.jpg`);
          await apiClient.saveInvoiceImage(kind, id, image);
        } catch (err) {
          console.warn('Could not save the invoice image for the WhatsApp reminder', err);
        }
      })();
    }, SAVE_DELAY_MS);
    // No cleanup of the timer on purpose: a strict-mode rerun must not cancel
    // the one save. The render fails quietly if the modal is already closed.
    return undefined;
  }, [kind, id, invoiceNumber]);
}
