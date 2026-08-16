/**
 * Indonesian Rupiah display. Always `Rp 1.200.000` — dots as thousands,
 * no decimals, same on server and browser (Intl locale data is not trusted).
 */

function roundedInt(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function formatNumber(value: number): string {
  const n = roundedInt(value);
  const sign = n < 0 ? '-' : '';
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const formatCurrency = (amount: number): string => {
  const n = roundedInt(amount);
  const sign = n < 0 ? '-' : '';
  return `${sign}Rp ${formatNumber(Math.abs(n))}`;
};

export const formatCurrencyCompact = (amount: number): string => {
  const n = roundedInt(amount);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const withComma = (value: number) => value.toFixed(1).replace('.', ',');
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${withComma(abs / 1_000_000_000)} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${withComma(abs / 1_000_000)} jt`;
  }
  if (abs >= 10_000) {
    return `${sign}Rp ${formatNumber(Math.round(abs / 1000))} rb`;
  }
  return formatCurrency(n);
};

export const parseCurrency = (value: string): number => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 0;
  const negative = trimmed.includes('-');
  const n = Number(trimmed.replace(/[^\d]/g, '')) || 0;
  return negative ? -n : n;
};

export const formatPrice = (amount: number, unit?: string): string => {
  const formatted = formatCurrency(amount);
  return unit ? `${formatted}/${unit}` : formatted;
};
