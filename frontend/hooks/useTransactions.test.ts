import { describe, it, expect, vi } from 'vitest';
import { ShiftType, PaymentStatus } from '../types';
import { saveActivity } from './useTransactions';

function makeApi() {
  return { updateActividad: vi.fn(), createActividad: vi.fn() };
}

const baseTx = {
  institution: 'Hospital Test',
  type: ShiftType.CONSULTATION,
  date: '2026-07-01',
  amount: 5000,
  status: PaymentStatus.PENDING,
  notes: 'procedimiento: ecografía abdominal',
};

describe('saveActivity — create-vs-update routing contract', () => {
  it('routes a payload WITH id to updateActividad (PUT) with that id', async () => {
    const activityApi = makeApi();

    await saveActivity(activityApi, { ...baseTx, id: 'real-extra-id' });

    expect(activityApi.updateActividad).toHaveBeenCalledOnce();
    expect(activityApi.updateActividad).toHaveBeenCalledWith('real-extra-id', expect.objectContaining({
      type: 'procedimiento',
      institution: 'Hospital Test',
      amount: 5000,
    }));
    expect(activityApi.createActividad).not.toHaveBeenCalled();
  });

  it('routes a payload WITHOUT id to createActividad (POST), never to update', async () => {
    const activityApi = makeApi();

    await saveActivity(activityApi, baseTx);

    expect(activityApi.createActividad).toHaveBeenCalledOnce();
    expect(activityApi.createActividad).toHaveBeenCalledWith(expect.objectContaining({
      type: 'procedimiento',
      institution: 'Hospital Test',
      amount: 5000,
    }));
    expect(activityApi.updateActividad).not.toHaveBeenCalled();
  });
});
