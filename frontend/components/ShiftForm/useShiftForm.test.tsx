// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ShiftType, PaymentStatus, type Institution } from '../../types';
import { toExtraActivity, newExtraActivity, getExtraId, resolveGuardiaRate, useShiftForm } from './useShiftForm';
import { formatMoneyInput, parseAmount } from '../../lib/utils';

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

describe('resolveGuardiaRate — holiday rule', () => {
  const inst = {
    id: 'i1',
    name: 'Hospital Test',
    guardia_semana_rate: 5000,
    guardia_feriado_rate: 9000,
    is_active: true,
  };

  it('uses feriado rate on a national holiday', () => {
    expect(resolveGuardiaRate('2026-05-25', inst, 5000)).toBe(9000);
  });

  it('uses manual/fallback rate on a regular day', () => {
    expect(resolveGuardiaRate('2026-05-26', inst, 5000)).toBe(5000);
  });

  it('uses fallback rate on a holiday when feriado rate is not configured', () => {
    const without = { ...inst, guardia_feriado_rate: null };
    expect(resolveGuardiaRate('2026-05-25', without, 5000)).toBe(5000);
  });

  it('honors a configured feriado rate of 0 (explicit value, not fallback)', () => {
    const withZero = { ...inst, guardia_feriado_rate: 0 };
    expect(resolveGuardiaRate('2026-05-25', withZero, 5000)).toBe(0);
  });

  it('returns fallback when institution is unknown', () => {
    expect(resolveGuardiaRate('2026-05-25', undefined, 4000)).toBe(4000);
  });
});

/** Renders the hook so we can exercise handleSelectInstitution + the $/Hora input wiring. */
function RatePrefillHarness({ institutions }: { institutions: Institution[] }) {
  const form = useShiftForm(() => {}, undefined, [], '2026-05-26', institutions, () => {}, 'es');
  return (
    <div>
      <button type="button" onClick={() => form.handleSelectInstitution('Hospital Test')}>select</button>
      {/* Mirrors ShiftForm.tsx $/Hora input: formatMoneyInput on every change */}
      <input
        value={form.hourlyRate}
        onChange={(e) => form.setHourlyRate(formatMoneyInput(e.target.value))}
      />
    </div>
  );
}

describe('useShiftForm — decimal rate prefill ($/Hora)', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const institutions: Institution[] = [{
    id: 'i1',
    name: 'Hospital Test',
    guardia_semana_rate: 1250.5,
    guardia_finde_rate: 8000,
    is_active: true,
  }];

  it('prefills a decimal rate as es-AR ("1.250,5") and typing an extra digit does not corrupt it', async () => {
    await act(async () => {
      root.render(<RatePrefillHarness institutions={institutions} />);
    });

    const selectBtn = container.querySelector('button') as HTMLButtonElement;
    act(() => { selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('1.250,5');

    // Append one more digit — the old '1250.5' prefill became '125.050' (dot
    // misread as thousands). The es-AR prefill must stay idempotent.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, '1.250,50');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(input.value).toBe('1.250,50');
    expect(parseAmount(input.value)).toBe(1250.5);
  });
});
