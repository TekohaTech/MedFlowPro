import { describe, it, expect } from 'vitest';
import { Institution } from '../types';
import { getInstitutionColorMap } from './institutionColors';

function makeInstitution(overrides: Partial<Institution> = {}): Institution {
  return { id: 'i1', name: 'X', color: null, is_active: true, ...overrides };
}

describe('getInstitutionColorMap', () => {
  it('keeps stored colors and auto-assigns free ones in list order', () => {
    const institutions = [
      makeInstitution({ id: 'i1', name: 'A', color: '#22c55e' }),
      makeInstitution({ id: 'i2', name: 'B' }),
      makeInstitution({ id: 'i3', name: 'C', color: '#f59e0b' }),
      makeInstitution({ id: 'i4', name: 'D' }),
    ];
    const map = getInstitutionColorMap(institutions);
    expect(map.get('A')).toBe('#22c55e');
    expect(map.get('B')).toBe('#ef4444'); // first free palette color
    expect(map.get('C')).toBe('#f59e0b');
    expect(map.get('D')).toBe('#3b82f6'); // next free palette color
  });

  it('is deterministic and never mutates the institutions list', () => {
    const institutions = [makeInstitution({ id: 'i1', name: 'A' }), makeInstitution({ id: 'i2', name: 'B' })];
    const first = getInstitutionColorMap(institutions);
    expect(first.get('A')).toBe('#ef4444');
    expect(first.get('B')).toBe('#3b82f6');
    // Same input → same assignment, no memoization or side effects needed
    expect(getInstitutionColorMap(institutions).get('A')).toBe('#ef4444');
    expect(institutions[0].color).toBeNull(); // stored data untouched
  });
});
