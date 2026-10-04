/**
 * What a failed WhatsApp receipt send means for Staff. Only a problem with
 * the number opens the number field: a new number fixes nothing else.
 */
export type ReceiptSendFailure =
  | 'not_configured' // the shop has no Wablas: no message on every payment
  | 'opt_out' // the customer asked for no WhatsApp
  | 'cooldown' // the same receipt went to the same number a moment ago
  | 'image' // the receipt image link does not open
  | 'package' // the Wablas package does not send this kind of message
  | 'number'; // the number is missing, wrong, or WhatsApp refused it

export function receiptSendFailure(message: string): ReceiptSendFailure {
  if (message.includes('WABLAS_NOT_CONFIGURED')) return 'not_configured';
  if (message.includes('CUSTOMER_WA_OPT_OUT')) return 'opt_out';
  if (message.includes('RECEIPT_COOLDOWN')) return 'cooldown';
  if (message.includes('RECEIPT_IMAGE_UNREACHABLE')) return 'image';
  // Wablas: "your package not support". It is the Wablas account, not the number.
  if (/package/i.test(message) && /not support/i.test(message)) return 'package';
  return 'number';
}

/** A plain sentence for Staff about a number problem. The raw error stays in the details. */
export function receiptNumberProblem(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('not registered') || text.includes('not on whatsapp') || text.includes('not exist')) {
    return 'This number is not on WhatsApp.';
  }
  if (text.includes('cannot be used for whatsapp') || text.includes('phone_required') || text.includes('invalid')) {
    return 'This number cannot be used for WhatsApp. Check the digits.';
  }
  if (text.includes('no customer') || text.includes('type the whatsapp number')) {
    return 'This receipt has no customer number. Type the number to send it to.';
  }
  return 'WhatsApp did not take the receipt for this number.';
}
