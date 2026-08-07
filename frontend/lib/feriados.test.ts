import { describe, it, expect } from 'vitest';
import { FERIADOS_ARGENTINA_2026, esFeriado, isHolidayDay, holidayName } from './feriados';

describe('FERIADOS_ARGENTINA_2026', () => {
  it('includes known 2026 national holidays', () => {
    expect(FERIADOS_ARGENTINA_2026.has('2026-05-25')).toBe(true);
    expect(FERIADOS_ARGENTINA_2026.has('2026-06-20')).toBe(true);
    expect(FERIADOS_ARGENTINA_2026.has('2026-01-01')).toBe(true);
  });

  it('includes trasladable holidays on their official Monday', () => {
    // Güemes trasladado al lunes 15 de junio; Soberanía al lunes 23 de noviembre
    expect(FERIADOS_ARGENTINA_2026.has('2026-06-15')).toBe(true);
    expect(FERIADOS_ARGENTINA_2026.has('2026-11-23')).toBe(true);
  });

  it('excludes the regular Friday 2026-11-20 (not a holiday)', () => {
    expect(FERIADOS_ARGENTINA_2026.has('2026-11-20')).toBe(false);
  });

  it('excludes regular days', () => {
    expect(FERIADOS_ARGENTINA_2026.has('2026-05-26')).toBe(false);
    expect(FERIADOS_ARGENTINA_2026.has('2026-12-31')).toBe(false);
  });
});

describe('esFeriado', () => {
  it('returns true for a holiday string', () => {
    expect(esFeriado('2026-05-25')).toBe(true);
  });

  it('returns false for a regular day string', () => {
    expect(esFeriado('2026-05-26')).toBe(false);
  });

  it('normalizes ISO string with time component', () => {
    expect(esFeriado('2026-05-25T10:30:00')).toBe(true);
  });

  it('normalizes Date with time component', () => {
    expect(esFeriado(new Date('2026-01-01T10:00:00'))).toBe(true);
  });

  it('uses local date parts, not UTC (late-night ARG does not shift day)', () => {
    // 23:30 local (UTC-3) → 02:30 UTC next day; toISOString() would shift to 05-26
    expect(esFeriado(new Date(2026, 4, 25, 23, 30))).toBe(true);
  });

  it('returns false for non-holiday date object', () => {
    expect(esFeriado(new Date('2026-12-31'))).toBe(false);
  });
});

describe('isHolidayDay', () => {
  it('returns true for a holiday Date built from local parts', () => {
    expect(isHolidayDay(new Date(2026, 4, 25))).toBe(true);
  });

  it('returns false for a regular day', () => {
    expect(isHolidayDay(new Date(2026, 4, 26))).toBe(false);
  });

  it('uses local date parts, not UTC (late-night ARG does not shift day)', () => {
    // 23:30 local (UTC-3) → 02:30 UTC next day; toISOString() would shift to 05-26
    expect(isHolidayDay(new Date(2026, 4, 25, 23, 30))).toBe(true);
  });

  it('works at exact midnight of a holiday', () => {
    expect(isHolidayDay(new Date(2026, 11, 25, 0, 0))).toBe(true); // Navidad
  });

  it('returns false for a non-holiday month edge', () => {
    expect(isHolidayDay(new Date(2026, 4, 31))).toBe(false);
  });
});

describe('holidayName', () => {
  it('returns the official name for a holiday ISO string', () => {
    expect(holidayName('2026-05-25')).toBe('Día de la Revolución de Mayo');
  });

  it('returns null for a regular day', () => {
    expect(holidayName('2026-05-26')).toBeNull();
  });

  it('normalizes ISO string with time component', () => {
    expect(holidayName('2026-05-25T10:30:00')).toBe('Día de la Revolución de Mayo');
  });

  it('returns the official name for a local Date', () => {
    expect(holidayName(new Date(2026, 4, 25))).toBe('Día de la Revolución de Mayo');
  });

  it('uses local date parts, not UTC (late-night ARG does not shift day)', () => {
    // 23:30 local (UTC-3) → 02:30 UTC next day; toISOString() would shift to 05-26
    expect(holidayName(new Date(2026, 4, 25, 23, 30))).toBe('Día de la Revolución de Mayo');
  });

  it('returns the official name for another holiday (Navidad)', () => {
    expect(holidayName('2026-12-25')).toBe('Navidad');
  });
});
