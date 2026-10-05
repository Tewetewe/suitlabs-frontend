export function facetLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const BOOKING_OCCASION_OPTIONS = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'wedding_guest', label: 'Wedding guest' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'university', label: 'University' },
  { value: 'sma_smk', label: 'SMA/SMK' },
  { value: 'smp', label: 'SMP' },
  { value: 'sd', label: 'SD' },
  { value: 'tk', label: 'TK' },
] as const;

/** Standard booking guarantees shown on POS and booking forms. */
export const BOOKING_GUARANTEE_OPTIONS = [
  { value: 'KTP', label: 'KTP' },
  { value: 'Passport', label: 'Passport' },
  { value: 'Student ID', label: 'Student ID' },
  { value: 'Existing Customer', label: 'Existing Customer' },
] as const;

export const EXISTING_CUSTOMER_GUARANTEE = 'Existing Customer';

export function isExistingCustomerGuarantee(value?: string | null): boolean {
  return (value || '').trim() === EXISTING_CUSTOMER_GUARANTEE;
}

export const CUSTOMER_LANGUAGE_OPTIONS = [
  { value: 'id', label: 'ID' },
  { value: 'en', label: 'EN' },
] as const;

export type CustomerLanguage = (typeof CUSTOMER_LANGUAGE_OPTIONS)[number]['value'];

export function customerLanguageLabel(value?: string | null): string {
  const found = CUSTOMER_LANGUAGE_OPTIONS.find((option) => option.value === value);
  return found?.label || 'ID';
}

export function occasionLabel(value?: string | null): string {
  const found = BOOKING_OCCASION_OPTIONS.find((option) => option.value === value);
  if (found) return found.label;
  if (!value) return 'Unspecified';
  return facetLabel(value);
}

export function facetOptions(
  values: string[] | undefined,
  emptyLabel?: string,
  pretty = true,
): { value: string; label: string }[] {
  const options = (values || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({ value, label: pretty ? facetLabel(value) : value }));
  return emptyLabel ? [{ value: '', label: emptyLabel }, ...options] : options;
}
