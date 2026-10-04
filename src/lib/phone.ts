/**
 * Phone numbers with a country code, for the WhatsApp sends.
 *
 * Staff pick the country and type the local number, or type the number with
 * its own code ("+82 10…" or "0082 10…"). An Indonesian number stays in the
 * local "0812…" form, so the customer phones already on file still match.
 * A foreign number is stored as "+<code><number>". The backend
 * (usecase.NormalizeWhatsAppPhone) reads both forms.
 */

export type PhoneCountry = { iso: string; name: string; dial: string };

export const HOME_COUNTRY = 'ID';
/** A code that is not on the list. Staff type it with the number. */
export const OTHER_COUNTRY = 'OTHER';

/** Indonesia first, then the countries most guests come from. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'ID', name: 'Indonesia', dial: '62' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'BR', name: 'Brazil', dial: '55' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'MY', name: 'Malaysia', dial: '60' },
  { iso: 'NL', name: 'Netherlands', dial: '31' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'RU', name: 'Russia', dial: '7' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'CH', name: 'Switzerland', dial: '41' },
  { iso: 'TW', name: 'Taiwan', dial: '886' },
  { iso: 'TH', name: 'Thailand', dial: '66' },
  { iso: 'TL', name: 'Timor-Leste', dial: '670' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'US', name: 'United States / Canada', dial: '1' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
];

const BY_ISO = new Map(PHONE_COUNTRIES.map((c) => [c.iso, c]));
// Longest code first, so +852 matches Hong Kong before a shorter code.
const BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

function digitsOf(text: string) {
  return text.replace(/\D/g, '');
}

/** True when the text carries its own country code: "+82…" or "0082…". */
export function hasDialCode(text: string) {
  const t = text.trim();
  return t.startsWith('+') || t.startsWith('00');
}

/** The digits after "+" or "00", that is the country code and the number. */
function internationalDigits(text: string) {
  const digits = digitsOf(text);
  return text.trim().startsWith('00') ? digits.slice(2) : digits;
}

function countryForDigits(digits: string) {
  return BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
}

/** Splits a stored phone into the country and the number for the form. */
export function splitPhone(value: string): { country: string; local: string } {
  const text = (value || '').trim();
  if (!hasDialCode(text)) return { country: HOME_COUNTRY, local: text };
  const digits = internationalDigits(text);
  const country = countryForDigits(digits);
  if (!country) return { country: OTHER_COUNTRY, local: text };
  const national = digits.slice(country.dial.length);
  return { country: country.iso, local: country.iso === HOME_COUNTRY ? `0${national.replace(/^0+/, '')}` : national };
}

/** The country that a typed "+code…" points to, or OTHER while it matches none. */
export function countryOfTyped(text: string) {
  return countryForDigits(internationalDigits(text))?.iso ?? OTHER_COUNTRY;
}

/**
 * Joins the country and the typed number into the value to store. A typed
 * code wins over the picked country.
 */
export function joinPhone(countryIso: string, local: string): string {
  const text = local.trim();
  if (!text) return '';
  let country = BY_ISO.get(countryIso);
  let national = digitsOf(text);
  if (hasDialCode(text)) {
    const digits = internationalDigits(text);
    country = countryForDigits(digits);
    if (!country) return digits ? `+${digits}` : '';
    national = digits.slice(country.dial.length);
  } else if (!country || country.iso === HOME_COUNTRY) {
    // Keep a local number as Staff typed it, like before.
    return text;
  }
  national = national.replace(/^0+/, '');
  if (!national) return '';
  return country.iso === HOME_COUNTRY ? `0${national}` : `+${country.dial}${national}`;
}

export function phoneCountryLabel(c: PhoneCountry) {
  return `+${c.dial} ${c.name}`;
}
