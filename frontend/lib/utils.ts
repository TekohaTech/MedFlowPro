import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  compact: boolean = false,
  locale: string = 'es-AR'
): string {
  // Show 2 decimals only when the amount has centavos; keep whole amounts clean.
  const hasFraction = Math.abs(amount - Math.trunc(amount)) > 0.0001;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

export function formatCurrencyFull(amount: number, locale: string = 'es-AR'): string {
  const hasFraction = Math.abs(amount - Math.trunc(amount)) > 0.0001;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

/**
 * Parse a user amount string (es-AR formatted) to a number of pesos.
 * Accepts '$1.250,50', '1.250,50', '1250.50', '5.000', '1250'.
 * ',' always means decimal separator; '.' is thousands unless the last group
 * has 1-2 digits ('1250.50' → decimal). Non-numeric chars ($, spaces) ignored.
 */
export function parseAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  if (cleaned.includes(',')) {
    // es-AR: '.' thousands, ',' decimal
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }

  const parts = cleaned.split('.');
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last.length === 3) {
      // Thousands separator: '5.000' or '1.234.567'
      return parseInt(cleaned.replace(/\./g, ''), 10) || 0;
    }
    // Dot-decimal: '1250.50'
    return parseFloat(cleaned) || 0;
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Live money-input sanitizer: keep digits, '.' (thousands) and ',' (decimal)
 * only; letters and other symbols never appear.
 */
export function sanitizeMoneyInput(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}

/**
 * Format a raw money-input keystroke es-AR style: '.' groups thousands and
 * ',' is the decimal separator. Idempotent on already-formatted strings, so
 * re-applying it on every keystroke is safe.
 *   '' → '', '8000' → '8.000', '1250,50' → '1.250,50',
 *   '8.000' → '8.000', '12345,5' → '12.345,5'.
 * Decimals are capped at 2 digits; a trailing ',' is preserved so the decimal
 * part can be typed naturally. Note: '.' is ALWAYS thousands here — use ','
 * for decimals (a raw '1250.50' collapses to '125.050').
 */
export function formatMoneyInput(value: string): string {
  const cleaned = sanitizeMoneyInput(value);
  if (!cleaned) return '';

  const commaIdx = cleaned.indexOf(',');
  let intPart = cleaned;
  let decPart = '';

  if (commaIdx !== -1) {
    intPart = cleaned.slice(0, commaIdx);
    decPart = cleaned.slice(commaIdx + 1).replace(/[.,]/g, '').slice(0, 2);
  }

  const digits = intPart.replace(/\D/g, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (commaIdx !== -1) {
    return decPart !== '' ? `${grouped},${decPart}` : `${grouped},`;
  }
  return grouped;
}