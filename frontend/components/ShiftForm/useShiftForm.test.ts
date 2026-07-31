import { describe, it, expect } from 'vitest';
import { ShiftType, PaymentStatus } from '../../types';
import { toExtraActivity, newExtraActivity, getExtraId } from './useShiftForm';

const loadedTx = {
  id: 'real-extra-id',
  institution: 'Hospital Test',
  type: ShiftType.CONSULTATION,
  date: '2026-07-01',
  amount: 5000,
  status: PaymentStatus.PENDING,
  notes: 'procedimiento: ecografía abdominal',
};

describe('useShiftForm extras — provenance and submit-id contract', () => {
  it('marks loaded extras as isNew: false, keeping their REAL id', () => {
    const loaded = toExtraActivity(loadedTx);

    expect(loaded.isNew).toBe(false);
    expect(loaded.id).toBe('real-extra-id');
  });

  it('marks newly added extras as isNew: true', () => {
    expect(newExtraActivity(3000).isNew).toBe(true);
  });

  it('emits the real id on submit for loaded extras (isNew: false) → update route', () => {
    expect(getExtraId({ id: 'real-extra-id', isNew: false })).toBe('real-extra-id');
  });

  it('emits no id on submit for added extras (isNew: true) → create route', () => {
    expect(getExtraId({ id: 'ephemeral-id', isNew: true })).toBeUndefined();
  });
});
