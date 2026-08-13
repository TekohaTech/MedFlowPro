import { describe, it, expect } from 'vitest';
import { computeGuardiaBreakdown } from './guardiaBreakdown';
import type { Institution } from '../types';

// Same convention as useShiftForm.test.tsx / guardiaHours.test.ts: local Date
// arithmetic must be deterministic regardless of the host TZ.
process.env.TZ = 'America/Argentina/Buenos_Aires';

const inst = (overrides: Partial<Institution> = {}): Institution => ({
  id: 'i1',
  name: 'Hospital Test',
  is_active: true,
  ...overrides,
});

describe('computeGuardiaBreakdown — rate fallback chain', () => {
  it('uses semana/finde/feriado rates when all are configured (fallback ignored)', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 7, 5, 8, 0),   // Wednesday
      new Date(2026, 7, 6, 8, 0),
      inst({ guardia_semana_rate: 5000, guardia_finde_rate: 8000, guardia_feriado_rate: 9000 }),
      9999,
    );
    expect(b.semanaRate).toBe(5000);
    expect(b.findeRate).toBe(8000);
    expect(b.feriadoRate).toBe(9000);
    expect(b.split).toEqual({ weekdayHours: 24, weekendHours: 0, feriadoHours: 0 });
  });

  it('legacy institution (guardia_rate only): finde falls back to the legacy rate', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 7, 5, 8, 0),
      new Date(2026, 7, 6, 8, 0),
      inst({ guardia_rate: 5000, guardia_feriado_rate: 9000 }),
      null,
    );
    expect(b.semanaRate).toBe(5000);
    expect(b.findeRate).toBe(5000);
    expect(b.feriadoRate).toBe(9000);
  });

  it('no institution: every rate resolves to the fallback (weekend included)', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 7, 5, 8, 0),
      new Date(2026, 7, 6, 8, 0),
      null,
      17000,
    );
    expect(b.semanaRate).toBe(17000);
    expect(b.findeRate).toBe(17000);
    expect(b.feriadoRate).toBeNull();
  });

  it('institution without rates + null fallback → all rates null', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 7, 5, 8, 0),
      new Date(2026, 7, 6, 8, 0),
      inst({}),
      null,
    );
    expect(b.semanaRate).toBeNull();
    expect(b.findeRate).toBeNull();
    expect(b.feriadoRate).toBeNull();
  });

  it('explicit zero fallback wins over null institution rates (0 is not null)', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 7, 5, 8, 0),
      new Date(2026, 7, 6, 8, 0),
      inst({}),
      0,
    );
    expect(b.semanaRate).toBe(0);
    expect(b.findeRate).toBe(0);
  });

  it('feriado rate of 0 still classifies holiday hours as feriado (flag is != null)', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 4, 25, 8, 0),  // Monday holiday
      new Date(2026, 4, 26, 8, 0),
      inst({ guardia_semana_rate: 5000, guardia_feriado_rate: 0 }),
      0,
    );
    expect(b.feriadoRate).toBe(0);
    expect(b.split).toEqual({ weekdayHours: 0, weekendHours: 0, feriadoHours: 24 });
  });

  it('no feriado rate → holiday hours fall into the weekday bucket', () => {
    const b = computeGuardiaBreakdown(
      new Date(2026, 4, 25, 8, 0),  // Monday holiday
      new Date(2026, 4, 26, 8, 0),
      inst({ guardia_semana_rate: 5000 }),
      null,
    );
    expect(b.feriadoRate).toBeNull();
    expect(b.split).toEqual({ weekdayHours: 24, weekendHours: 0, feriadoHours: 0 });
  });
});
