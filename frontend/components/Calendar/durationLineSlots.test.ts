import { describe, it, expect } from 'vitest';
import { computeLineSlots, buildDayLines, lineKey } from './durationLineSlots';
import { ShiftType, PaymentStatus, Transaction } from '../../types';

// Local Date factory (local midnight → format() keeps the same calendar day).
const aug = (d: number) => new Date(2026, 7, d);

function guardia(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'g1',
    institution: 'Madariaga',
    type: ShiftType.ACTIVE,
    date: '2026-08-02',
    endDate: '2026-08-04',
    startTime: '08:00',
    endTime: '08:00',
    amount: 816007.92,
    status: PaymentStatus.PENDING,
    ...overrides,
  };
}

describe('buildDayLines — per-day visual lines', () => {
  it('a simple multi-day guardia: dot only on start, end marker only on the LAST day', () => {
    const tx = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    expect(buildDayLines('2026-08-02', [tx])).toEqual([
      { institution: 'Madariaga', startsToday: true, endsToday: false, anchorId: 'a' },
    ]);
    expect(buildDayLines('2026-08-03', [tx])).toEqual([
      { institution: 'Madariaga', startsToday: false, endsToday: false, anchorId: 'a' },
    ]);
    expect(buildDayLines('2026-08-05', [tx])).toEqual([
      { institution: 'Madariaga', startsToday: false, endsToday: true, anchorId: 'a' },
    ]);
  });

  it('lines are ordered by the EARLIEST start date of the covering guardia', () => {
    const a = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const b = guardia({ id: 'b', institution: 'Clínica', date: '2026-08-04', endDate: '2026-08-06' });
    const day4 = buildDayLines('2026-08-04', [a, b]);
    expect(day4.map(l => l.institution)).toEqual(['Madariaga', 'Clínica']);
    expect(day4.map(lineKey)).toEqual(['Madariaga::a', 'Clínica::b']);
  });

  it('end+start same day, same institution → TWO lines: ending (no dot) then starting (dot)', () => {
    const a = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const b = guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-08' });
    const day5 = buildDayLines('2026-08-05', [a, b]);
    expect(day5).toHaveLength(2);
    expect(day5[0]).toEqual({ institution: 'Madariaga', startsToday: false, endsToday: true, anchorId: 'a' });
    expect(day5[1]).toEqual({ institution: 'Madariaga', startsToday: true, endsToday: false, anchorId: 'b' });
  });

  it('two 1-day guardias of the same institution the same day dedupe into ONE line (anchor = min id)', () => {
    const x = guardia({ id: 'x', date: '2026-08-02', endDate: '2026-08-02' });
    const y = guardia({ id: 'y', date: '2026-08-02', endDate: '2026-08-02' });
    const lines = buildDayLines('2026-08-02', [x, y]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({ institution: 'Madariaga', startsToday: true, endsToday: true, anchorId: 'x' });
  });

  it('KNOWN LIMITATION: a 1-day + multi-day guardia of the SAME institution starting the SAME day COLLIDE (same anchor/key)', () => {
    // The 1-day guardia ('a') and the multi-day one ('m') both start on 03/08.
    // 'a' < 'm' → the min-id tie-break makes the 1-day guardia the anchor of
    // BOTH split lines (anchor(et) and anchor(st)) → identical keys → the slot
    // model gives them ONE slot and they overlap. Documented in the module
    // docstring; not yet solved.
    const multi = guardia({ id: 'm', date: '2026-08-03', endDate: '2026-08-06' });
    const single = guardia({ id: 'a', date: '2026-08-03', endDate: '2026-08-03' });
    const day3 = buildDayLines('2026-08-03', [multi, single]);
    expect(day3).toHaveLength(2); // split: ending + starting lines DO render
    expect(day3[0].anchorId).toBe('a');
    expect(day3[1].anchorId).toBe('a');
    expect(lineKey(day3[0])).toBe(lineKey(day3[1])); // …but they share a key
  });
});

describe('computeLineSlots — persistent slot simulation', () => {
  it('a simple multi-day guardia keeps slot 1 on every day it covers', () => {
    const tx = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const slots = computeLineSlots([aug(2), aug(3), aug(4), aug(5)], [tx]);
    expect(slots.get('Madariaga::a')).toBe(1);
    expect([...slots.values()]).toEqual([1]);
  });

  it('a second institution starting later takes slot 2 while both are active', () => {
    const a = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const b = guardia({ id: 'b', institution: 'Clínica', date: '2026-08-04', endDate: '2026-08-06' });
    const slots = computeLineSlots([aug(2), aug(3), aug(4), aug(5), aug(6)], [a, b]);
    expect(slots.get('Madariaga::a')).toBe(1);
    expect(slots.get('Clínica::b')).toBe(2);
  });

  it('end+start same day, same institution: the ending guardia KEEPS its slot, the starting guardia takes the first free one', () => {
    const a = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const b = guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-08' });
    const slots = computeLineSlots([aug(2), aug(3), aug(4), aug(5), aug(6), aug(7), aug(8)], [a, b]);
    expect(slots.get('Madariaga::a')).toBe(1); // ended on 05/08, kept its slot
    expect(slots.get('Madariaga::b')).toBe(2); // took the slot right below A
  });

  it('an ending guardia RELEASES its slot; a continuing line keeps the slot it took (never renumbered)', () => {
    // A (Madariaga 02→05) and C (Sanatorio 02→03) start the same day: A→1, C→2.
    // B (Clínica) starts on 03/08 while C is still active → first free slot = 3.
    // C ends 03/08 and RELEASES slot 2 (stays empty); B keeps slot 3 forever,
    // even alone on 06/08..07/08 — never renumbered down to 1.
    const a = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const c = guardia({ id: 'c', institution: 'Sanatorio', date: '2026-08-02', endDate: '2026-08-03' });
    const b = guardia({ id: 'b', institution: 'Clínica', date: '2026-08-03', endDate: '2026-08-07' });
    const slots = computeLineSlots(
      [aug(2), aug(3), aug(4), aug(5), aug(6), aug(7)],
      [a, c, b],
    );
    expect(slots.get('Madariaga::a')).toBe(1);
    expect(slots.get('Sanatorio::c')).toBe(2);
    expect(slots.get('Clínica::b')).toBe(3);
    // B alone on 06/08: still slot 3.
    const day6 = buildDayLines('2026-08-06', [b]);
    expect(day6).toHaveLength(1);
    expect(day6[0].anchorId).toBe('b');
    expect(slots.get(lineKey(day6[0]))).toBe(3);
  });

  it('split-day keys: the ending line keeps the anchor (and slot) it had the day before', () => {
    const a = guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' });
    const b = guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-08' });
    const day4 = buildDayLines('2026-08-04', [a, b]);
    const day5 = buildDayLines('2026-08-05', [a, b]);
    expect(day4[0].anchorId).toBe('a');
    expect(day5[0].anchorId).toBe('a'); // ending line anchors the SAME guardia
    expect(lineKey(day4[0])).toBe(lineKey(day5[0]));
    const slots = computeLineSlots([aug(2), aug(3), aug(4), aug(5)], [a, b]);
    expect(slots.get(lineKey(day4[0]))).toBe(1);
    expect(slots.get(lineKey(day5[0]))).toBe(1); // unchanged across the split
    expect(slots.get(lineKey(day5[1]))).toBe(2);
  });

  it('KNOWN LIMITATION: colliding split-day lines share ONE slot; the multi-day guardia restarts at slot 1 the next day', () => {
    // Same collision as the buildDayLines test above: on 03/08 both split lines
    // share key 'Madariaga::a' → ONE slot (1). From 04/08 the multi-day guardia
    // anchors 'm' (new key) and takes the first free slot — which is 1, since
    // 'a' stopped appearing. Both lines overlap on 03/08: documented, not solved.
    const multi = guardia({ id: 'm', date: '2026-08-03', endDate: '2026-08-06' });
    const single = guardia({ id: 'a', date: '2026-08-03', endDate: '2026-08-03' });
    const slots = computeLineSlots([aug(3), aug(4), aug(5), aug(6)], [multi, single]);
    expect(slots.get('Madariaga::a')).toBe(1);
    expect(slots.get('Madariaga::m')).toBe(1);
  });
});
