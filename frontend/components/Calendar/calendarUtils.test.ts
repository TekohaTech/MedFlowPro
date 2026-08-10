import { describe, it, expect } from 'vitest';
import { ShiftType, PaymentStatus, type Transaction } from '../../types';
import { getShiftsForDay, formatGuardiaRange } from './calendarUtils';

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
    expect(formatGuardiaRange(tx({ endDate: '2026-07-03' }))).toBe('Guardia de 24h · 02/07 08:00 → 03/07 08:00');
  });

  it('shows 72h for a 3-day guardia', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-05' }))).toBe('Guardia de 72h · 02/07 08:00 → 05/07 08:00');
  });

  it('shows plain times for a same-day guardia', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-02', endTime: '20:00' }))).toBe('08:00 → 20:00');
  });

  it('uses the stored duration when present', () => {
    expect(formatGuardiaRange(tx({ endDate: '2026-07-03', duration: 24 }))).toBe('Guardia de 24h · 02/07 08:00 → 03/07 08:00');
  });

  it('shows a dated range for a non-guardia item that crosses days', () => {
    const proc = tx({ type: ShiftType.CONSULTATION, endDate: '2026-07-03' });
    expect(formatGuardiaRange(proc)).toBe('02/07 08:00 → 03/07 08:00');
  });

  it('returns empty string when times are missing', () => {
    expect(formatGuardiaRange(tx({ startTime: undefined, endTime: undefined }))).toBe('');
  });
});
