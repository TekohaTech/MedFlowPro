import { describe, it, expect } from 'vitest';
import { parseAmount, formatCurrency, sanitizeMoneyInput, formatMoneyInput } from './utils';

describe('parseAmount', () => {
  it('parses es-AR formatted string with $ prefix and comma decimal', () => {
    expect(parseAmount('$1.250,50')).toBe(1250.5);
  });

  it('parses es-AR formatted string without currency symbol', () => {
    expect(parseAmount('1.250,50')).toBe(1250.5);
  });

  it('parses dot-decimal string', () => {
    expect(parseAmount('1250.50')).toBe(1250.5);
  });

  it('parses plain integer string', () => {
    expect(parseAmount('1250')).toBe(1250);
  });

  it('parses thousands-separated integer', () => {
    expect(parseAmount('5.000')).toBe(5000);
  });

  it('parses full groups with thousands separators', () => {
    expect(parseAmount('$ 1.234.567')).toBe(1234567);
  });

  it('returns 0 for empty input', () => {
    expect(parseAmount('')).toBe(0);
  });

  it('returns 0 for unparseable input', () => {
    expect(parseAmount('abc')).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('shows 2 decimals when the amount has centavos', () => {
    expect(formatCurrency(1250.5)).toBe('$\u00A01.250,50');
  });

  it('shows no decimals for whole amounts', () => {
    expect(formatCurrency(5000)).toBe('$\u00A05.000');
  });

  it('shows centavos in thousands ranges', () => {
    expect(formatCurrency(1234567.25)).toBe('$\u00A01.234.567,25');
  });
});

describe('sanitizeMoneyInput', () => {
  it('keeps digits, dot and comma; drops letters and symbols', () => {
    expect(sanitizeMoneyInput('1250,50')).toBe('1250,50');
    expect(sanitizeMoneyInput('8.000')).toBe('8.000');
    expect(sanitizeMoneyInput('12abc50,5x')).toBe('1250,5');
    expect(sanitizeMoneyInput('abc')).toBe('');
  });
});

describe('formatMoneyInput', () => {
  it('returns empty string for empty input', () => {
    expect(formatMoneyInput('')).toBe('');
    expect(formatMoneyInput('abc')).toBe('');
  });

  it('groups thousands with dots as you type', () => {
    expect(formatMoneyInput('8000')).toBe('8.000');
    expect(formatMoneyInput('12000')).toBe('12.000');
  });

  it('is idempotent on already-formatted strings', () => {
    expect(formatMoneyInput('8.000')).toBe('8.000');
    expect(formatMoneyInput('1.250,50')).toBe('1.250,50');
  });

  it('keeps comma as decimal separator with up to 2 digits', () => {
    expect(formatMoneyInput('1250,50')).toBe('1.250,50');
    expect(formatMoneyInput('12345,5')).toBe('12.345,5');
  });

  it('preserves a trailing comma while the decimal part is being typed', () => {
    expect(formatMoneyInput('1250,')).toBe('1.250,');
  });

  it('caps the decimal part at 2 digits', () => {
    expect(formatMoneyInput('1,505')).toBe('1,50');
  });

  it('treats dot as thousands separator (es-AR rule)', () => {
    expect(formatMoneyInput('1250.50')).toBe('125.050');
  });
});
