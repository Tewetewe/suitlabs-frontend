'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Select } from './Select';
import { CONTROL_CLASS, controlBorderClass, fieldLabelClass } from './field';
import {
  OTHER_COUNTRY,
  PHONE_COUNTRIES,
  countryOfTyped,
  hasDialCode,
  joinPhone,
  phoneCountryLabel,
  splitPhone,
} from '@/lib/phone';

type PhoneInputProps = {
  label?: string;
  value: string;
  /** Gets the value to store: "0812…" for Indonesia, "+<code><number>" for the rest. */
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  'data-testid'?: string;
};

/**
 * A phone field with a country list. Staff pick the country and type the
 * local number, or type "+code" in the number and the list follows it.
 */
export function PhoneInput({
  label,
  value,
  onChange,
  error,
  helperText,
  placeholder,
  required,
  disabled,
  id,
  'data-testid': testId,
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [parts, setParts] = useState(() => splitPhone(value));
  const lastEmitted = useRef(value);

  // A new record from the parent (another customer, a form reset) refills the
  // field. The value this field sent itself does not, so typing is kept.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setParts(splitPhone(value));
  }, [value]);

  const emit = (country: string, local: string) => {
    setParts({ country, local });
    const next = joinPhone(country, local);
    lastEmitted.current = next;
    onChange(next);
  };

  const options = useMemo(
    () => [
      ...PHONE_COUNTRIES.map((c) => ({ value: c.iso, label: phoneCountryLabel(c) })),
      { value: OTHER_COUNTRY, label: 'Other (type +code)' },
    ],
    [],
  );

  const pickCountry = (country: string) => {
    if (!country) return;
    // A picked country replaces a typed code, so keep only the number.
    const local = hasDialCode(parts.local) ? splitPhone(joinPhone(parts.country, parts.local)).local : parts.local;
    emit(country, country === OTHER_COUNTRY ? local : local.replace(/^\+/, ''));
  };

  const typeNumber = (local: string) => {
    emit(hasDialCode(local) ? countryOfTyped(local) : parts.country, local);
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={fieldLabelClass()}>
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="w-36 shrink-0 sm:w-44">
          <Select
            value={parts.country}
            onChange={(e) => pickCountry(e.target.value)}
            options={options}
            clearable={false}
            searchPlaceholder="Country or code"
            disabled={disabled}
          />
        </div>
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          required={required}
          disabled={disabled}
          value={parts.local}
          onChange={(e) => typeNumber(e.target.value)}
          placeholder={placeholder ?? (parts.country === 'ID' ? '0812…' : parts.country === OTHER_COUNTRY ? '+354 611 2345' : 'Number')}
          data-testid={testId}
          aria-invalid={Boolean(error)}
          className={clsx(CONTROL_CLASS, controlBorderClass(error), disabled && 'cursor-not-allowed opacity-60')}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

export default PhoneInput;
