import { describe, it, expect } from 'vitest';
import { classifyGuardiaHours } from './guardiaHours';

// Same convention as useShiftForm.test.tsx: local Date arithmetic must be
// deterministic regardless of the host TZ (America/Argentina/Buenos_Aires
// has no DST transitions).
process.env.TZ = 'America/Argentina/Buenos_Aires';

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

describe('guardias largas que cruzan feriados', () => {
  // No 2026 holiday falls on a Wednesday, so the "start before a holiday with
  // it inside" template (Tue → Fri with Wed holiday) is covered with the real
  // Thursday holiday 2026-07-09: Wed 08:00 → Sat 08:00 = 72h.
  it('72h starting before a holiday with the holiday inside: Wed 08:00 → Sat 08:00 (Thu 2026-07-09 holiday) = 24 weekday + 24 feriado + 24 weekday', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 6, 8, 8, 0),   // Wednesday
      new Date(2026, 6, 11, 8, 0),  // Saturday
    );
    expect(split).toEqual({ weekdayHours: 48, weekendHours: 0, feriadoHours: 24 });
  });

  it('24h starting ON a Monday holiday (2026-05-25) = 24 feriado hours', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 4, 25, 8, 0),
      new Date(2026, 4, 26, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 0, weekendHours: 0, feriadoHours: 24 });
  });

  it('24h starting ON a weekend-day holiday (2026-06-20 Saturday): feriado wins over finde', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 20, 8, 0),
      new Date(2026, 5, 21, 8, 0),
    );
    expect(split).toEqual({ weekdayHours: 0, weekendHours: 0, feriadoHours: 24 });
  });

  it('holiday falls back to its weekday/weekend bucket when holidaysAsFeriado=false', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 4, 25, 8, 0),  // Monday holiday
      new Date(2026, 4, 26, 8, 0),
      false,
    );
    expect(split).toEqual({ weekdayHours: 24, weekendHours: 0, feriadoHours: 0 });
  });

  it('72h spanning weekday + weekend + holiday: Fri 08:00 → Mon 08:00 with Sat 2026-06-20 holiday = 24 weekday + 24 feriado + 24 weekend', () => {
    const split = classifyGuardiaHours(
      new Date(2026, 5, 19, 8, 0),  // Friday
      new Date(2026, 5, 22, 8, 0),  // Monday
    );
    expect(split).toEqual({ weekdayHours: 24, weekendHours: 24, feriadoHours: 24 });
  });
});
