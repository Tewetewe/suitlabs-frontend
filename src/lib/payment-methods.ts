export const BOOKING_PAYMENT_METHOD_OPTIONS = [
  { value: 'dp_cash', label: 'DP Cash' },
  { value: 'full_cash', label: 'Full Cash' },
  { value: 'dp_transfer', label: 'DP Transfer' },
  { value: 'full_transfer', label: 'Full Transfer' },
  { value: 'dp_qris', label: 'DP QRIS' },
  { value: 'full_qris', label: 'Full QRIS' },
  { value: 'dp_debit', label: 'DP Debit' },
  { value: 'full_debit', label: 'Full Debit' },
  { value: 'dp_cc', label: 'DP Credit Card' },
  { value: 'full_cc', label: 'Full Credit Card' },
] as const;

export const SALE_PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'debit', label: 'Debit' },
  { value: 'cc', label: 'Credit Card' },
] as const;

export const DEPOSIT_PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ...Object.fromEntries(BOOKING_PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label])),
  ...Object.fromEntries(SALE_PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label])),
};

export function formatPaymentMethod(value?: string | null): string {
  if (!value) return '—';
  return PAYMENT_METHOD_LABELS[value] || value;
}
