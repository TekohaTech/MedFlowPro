import { describe, it, expect } from 'vitest';
import { classifyGuardiaHours } from './guardiaHours';

describe('classifyGuardiaHours — medical day (08:00 → 08:00)', () => {
  it('case a: Friday 08:00 → Saturday 08:00 = 24 weekday hours', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 5, 8, 0),
      new Date(2026, 5, 6, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 24, weekendHours: 0, feriadoHours: 0 });
  });

  it('case b: Saturday 08:00 → Sunday 08:00 = 24 weekend hours', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 6, 8, 0),
      new Date(2026, 5, 7, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 0, weekendHours: 24, feriadoHours: 0 });
  });

  it('case c: holiday 08:00 → next day 08:00 = 24 feriado hours', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 4, 25, 8, 0),
      new Date(2026, 4, 26, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 0, weekendHours: 0, feriadoHours: 24 });
  });

  it('case d: 48h from holiday 08:00 = 24 feriado + 24 weekday hours', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 4, 25, 8, 0),
      new Date(2026, 4, 27, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 24, weekendHours: 0, feriadoHours: 24 });
  });

  it('case e: Friday 14:00 → Saturday 14:00 = 18 weekday + 6 weekend hours', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 5, 14, 0),
      new Date(2026, 5, 6, 14, 0),
    );
    expect(split).toEqual({ weekdayHours: 18, weekendHours: 6, feriadoHours: 0 });
  });

  it('holiday on Saturday counts as feriado (feriado > finde priority)', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 20, 8, 0),
      new Date(2026, 5, 21, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 0, weekendHours: 0, feriadoHours: 24 });
  });

  it('hours 00:00-08:00 belong to the previous day medical day', () => {
    // Sat 00:00 → Sun 00:00: 00-08h → Friday medical day (weekday)
    const split = classifyGuardiaHours(
      new Date(2026, 5, 6, 0, 0),
      new Date(2026, 5, 7, 0, 0),
    );
    expect(split).toEqual({ weekdayHours: 8, weekendHours: 16, feriadoHours: 0 });
  });

  it('three medical days: Fri 08:00 → Sun 08:00 = 24 weekday + 24 weekend', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 5, 8, 0),  // Friday
      new Date(2026, 5, 7, 8, 0),  // Sunday
    );
    expect(split).toEqual({ weekdayHours: 24, weekendHours: 24, feriadoHours: 0 });
  });

  it('holidaysAsFeriado=false falls holiday hours back to weekday/weekend', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 4, 25, 8, 0),
      new Date(2026, 4, 26, 8, 0),
      false,
    );
    expect(split).toEqual({ weekdayHours: 24, weekendHours: 0, feriadoHours: 0 });
  });
});
