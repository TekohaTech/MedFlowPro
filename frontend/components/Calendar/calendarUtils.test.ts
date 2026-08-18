import { describe, it, expect } from 'vitest';
import { ShiftType, PaymentStatus, type Transaction } from '../../types';
import {
  getShiftsForDay, formatGuardiaRange, formatCoverageDetail,
  formatCompactAmount, isShiftStart, isShiftCoverage,
  formatSrOnlyDurationSummary,
} from './calendarUtils';

const guardia: Transaction = {
  id: 'g1',
  institution: 'Madariaga',
  type: ShiftType.ACTIVE,
  date: '2026-07-02',
  endDate: '2026-07-03',
  startTime: '08:00',
  endTime: '08:00',
  amount: 300000,
  status: PaymentStatus.PENDING,
};

const interconsulta: Transaction = {
  id: 'ic1',
  institution: 'Madariaga',
  type: ShiftType.PASSIVE,
  date: '2026-07-02',
  endDate: '2026-07-02',
  amount: 15000,
  status: PaymentStatus.PENDING,
  notes: 'interconsulta cardio',
};

const otraInstitucion: Transaction = {
  id: 'otra',
  institution: 'Otro Sanatorio',
  type: ShiftType.PASSIVE,
  date: '2026-07-02',
  endDate: '2026-07-02',
  amount: 10000,
  status: PaymentStatus.PENDING,
  notes: 'interconsulta otra',
};

describe('getShiftsForDay', () => {
  it('includes guardia and sub-items on the guardia start day', () => {
    const shifts = getShiftsForDay(new Date(2026, 6, 2), [guardia, interconsulta]);
    expect(shifts.map(s => s.id)).toContain('g1');
    expect(shifts.map(s => s.id)).toContain('ic1');
  });

  it('includes guardia AND its same-institution sub-items on a coverage day', () => {
    const shifts = getShiftsForDay(new Date(2026, 6, 3), [guardia, interconsulta]);
    expect(shifts.map(s => s.id)).toContain('g1');
    expect(shifts.map(s => s.id)).toContain('ic1');
  });

  it('does NOT pull sub-items from another institution onto the coverage day', () => {
    const shifts = getShiftsForDay(new Date(2026, 6, 3), [guardia, otraInstitucion]);
    expect(shifts.map(s => s.id)).toContain('g1');
    expect(shifts.map(s => s.id)).not.toContain('otra');
  });

  it('returns nothing outside the coverage range', () => {
    const shifts = getShiftsForDay(new Date(2026, 6, 4), [guardia, interconsulta]);
    expect(shifts).toHaveLength(0);
  });
});

describe('formatGuardiaRange', () => {
  const tx = (overrides: Partial<Transaction>): Transaction => ({
    id: 'x', institution: 'X', type: ShiftType.ACTIVE, date: '2026-07-02',
    startTime: '08:00', endTime: '08:00', amount: 0, status: PaymentStatus.PENDING,
    ...overrides,
  });

  it('shows duration + full range for a 24h guardia that crosses days', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-03' }), 'Guardia de')).toBe('Guardia de 24h · 02/07 08:00 → 03/07 08:00');
  });

  it('shows 72h for a 3-day guardia', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-05' }), 'Guardia de')).toBe('Guardia de 72h · 02/07 08:00 → 05/07 08:00');
  });

  it('shows plain times for a same-day guardia', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-02', endTime: '20:00' }), 'Guardia de')).toBe('08:00 → 20:00');
  });

  it('uses the stored duration when present', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-03', duration: 24 }), 'Guardia de')).toBe('Guardia de 24h · 02/07 08:00 → 03/07 08:00');
  });

  it('shows a dated range for a non-guardia item that crosses days', () => {
    const proc = tx({ type: ShiftType.CONSULTATION, endDate: '2026-07-03' });
    expect(formatGuardiaRange(proc, 'Guardia de')).toBe('02/07 08:00 → 03/07 08:00');
  });

  it('returns empty string when times are missing', () => {
    expect(formatGuardiaRange(tx({ startTime: undefined, endTime: undefined }), 'Guardia de')).toBe('');
  });
});

describe('isShiftStart / isShiftCoverage', () => {
  const multi = {
    ...guardia,
    id: 'm',
    date: '2026-08-02',
    endDate: '2026-08-04',
    startTime: '08:00',
    endTime: '08:00',
  };

  it('isShiftStart is true only on tx.date', () => {
    expect(isShiftStart('2026-08-02', multi)).toBe(true);
    expect(isShiftStart('2026-08-03', multi)).toBe(false);
    expect(isShiftStart('2026-08-04', multi)).toBe(false);
  });

  it('isShiftCoverage is true on covered days, false on the start day and outside the range', () => {
    expect(isShiftCoverage('2026-08-02', multi)).toBe(false); // start day
    expect(isShiftCoverage('2026-08-03', multi)).toBe(true);
    expect(isShiftCoverage('2026-08-04', multi)).toBe(true); // endDate inclusive
    expect(isShiftCoverage('2026-08-05', multi)).toBe(false);
  });

  it('isShiftCoverage is false for non-guardia items', () => {
    const proc = { ...multi, type: ShiftType.CONSULTATION };
    expect(isShiftCoverage('2026-08-03', proc)).toBe(false);
  });
});

describe('formatCompactAmount', () => {
  it('renders the compact "$Nk" style', () => {
    expect(formatCompactAmount(408000)).toBe('$408k');
    expect(formatCompactAmount(816007.92)).toBe('$816k');
    expect(formatCompactAmount(1020007.92)).toBe('$1020k');
    expect(formatCompactAmount(0)).toBe('$0k');
  });
});

describe('formatCoverageDetail', () => {
  it('shows duration + "comenzó" range for a multi-day guardia', () => {
    const multi: Transaction = {
      id: 'm', institution: 'X', type: ShiftType.ACTIVE,
      date: '2026-08-02', endDate: '2026-08-04',
      startTime: '08:00', endTime: '08:00',
      amount: 0, status: PaymentStatus.PENDING,
    };
    expect(formatCoverageDetail(multi, 'Guardia de')).toBe('Guardia de 48h · comenzó 02/08 08:00 → 04/08 08:00');
  });
});

describe('formatSrOnlyDurationSummary', () => {
  it('singular for a single coverage-only line: "Guardia activa: X"', () => {
    expect(formatSrOnlyDurationSummary([
      { institution: 'Madariaga', startsToday: false, endsToday: false },
    ])).toBe('Guardia activa: Madariaga');
  });

  it('per-line flags: "termina hoy" / "comienza hoy" / "comienza y termina hoy"', () => {
    expect(formatSrOnlyDurationSummary([
      { institution: 'Madariaga', startsToday: false, endsToday: true },
      { institution: 'Clínica', startsToday: true, endsToday: false },
      { institution: 'Sanatorio', startsToday: true, endsToday: true },
    ])).toBe(
      'Guardias activas: Madariaga (termina hoy), Clínica (comienza hoy), Sanatorio (comienza y termina hoy)',
    );
  });

  it('continuing lines in a multi-line day carry no flag (plain institution name)', () => {
    expect(formatSrOnlyDurationSummary([
      { institution: 'Madariaga', startsToday: false, endsToday: true },
      { institution: 'Clínica', startsToday: false, endsToday: false },
    ])).toBe('Guardias activas: Madariaga (termina hoy), Clínica');
  });

  it('SINGULAR even WITH a flag: one line that starts today', () => {
    expect(formatSrOnlyDurationSummary([
      { institution: 'Madariaga', startsToday: true, endsToday: false },
    ])).toBe('Guardia activa: Madariaga (comienza hoy)');
  });

  it('empty input returns an empty string', () => {
    expect(formatSrOnlyDurationSummary([])).toBe('');
  });
});
