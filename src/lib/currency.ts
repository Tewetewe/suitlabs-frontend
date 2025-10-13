/**
 * Currency utility functions for Indonesian Rupiah (IDR)
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000000) {
    return `Rp ${(amount / 1000000000).toFixed(1)}M`;
  } else if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  } else if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}rb`;
  }
  return formatCurrency(amount);
};

export const parseCurrency = (value: string): number => {
  // Remove all non-numeric characters except decimal point
  const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(numericValue) || 0;
};

export const formatPrice = (amount: number, unit?: string): string => {
  const formatted = formatCurrency(amount);
  return unit ? `${formatted}/${unit}` : formatted;
};