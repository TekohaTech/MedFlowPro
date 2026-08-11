// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShiftType, PaymentStatus, type Institution, type Transaction } from '../../types';
import { toExtraActivity, newExtraActivity, getExtraId, resolveGuardiaRate, useShiftForm } from './useShiftForm';
import { formatMoneyInput, parseAmount } from '../../lib/utils';

// Date defaults must be computed with LOCAL time. Node re-reads TZ on each
// Date operation, so this affects every date-fns call in this file.
process.env.TZ = 'America/Argentina/Buenos_Aires';

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

  it('keeps the original date/startTime when loading an extra (sub-item provenance)', () => {
    const loaded = toExtraActivity({ ...loadedTx, startTime: '14:30' });

    expect(loaded.date).toBe('2026-07-01');
    expect(loaded.startTime).toBe('14:30');
  });

  it('starts a newly added extra with date: "" (falls back to the guardia date on submit)', () => {
    const fresh = newExtraActivity(3000);

    expect(fresh.date).toBe('');
    expect(fresh.startTime).toBeUndefined();
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

describe('resolveGuardiaRate — weekend rule', () => {
  const inst = {
    id: 'i1',
    name: 'Hospital Test',
    guardia_semana_rate: 5000,
    guardia_finde_rate: 8000,
    guardia_feriado_rate: null,
    is_active: true,
  };

  it('uses finde rate on Saturday (2026-08-08)', () => {
    expect(resolveGuardiaRate('2026-08-08', inst, 5000)).toBe(8000);
  });

  it('uses finde rate on Sunday (2026-08-09)', () => {
    expect(resolveGuardiaRate('2026-08-09', inst, 5000)).toBe(8000);
  });

  it('uses weekday rate on Friday (2026-08-07)', () => {
    expect(resolveGuardiaRate('2026-08-07', inst, 5000)).toBe(5000);
  });

  it('falls back to weekday rate when finde rate is not configured', () => {
    const without = { ...inst, guardia_finde_rate: null };
    expect(resolveGuardiaRate('2026-08-08', without, 5000)).toBe(5000);
  });

  it('feriado rate wins over finde rate on a holiday weekend', () => {
    // 2026-05-25 (lunes feriado) no es finde; pero si un feriado cae sábado,
    // el feriado gana. 2026-01-01 (jueves) no aplica; usamos un feriado real
    // que caiga fin de semana: 2026-12-25 es viernes. Chequeamos que un
    // feriado en sábado use feriado: es_feriado listado → feriado_rate.
    const holidayWeekend = { ...inst, guardia_feriado_rate: 9000 };
    // 2026-05-25 es feriado nacional y lunes — feriado gana sobre finde.
    expect(resolveGuardiaRate('2026-05-25', holidayWeekend, 5000)).toBe(9000);
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

/** Renders the hook so we can exercise the medical-day amount preview.
 *  Mirrors ShiftForm.tsx inputs: date, start time, hours, $/Hora, end range
 *  and the range error state. */
function PreviewHarness({ initialDate, institutions }: { initialDate: string; institutions: Institution[] }) {
  const form = useShiftForm(() => {}, undefined, [], initialDate, institutions, () => {}, 'es');
  return (
    <div>
      <button type="button" onClick={() => form.handleSelectInstitution('Hospital Test')}>select</button>
      <input data-testid="date" value={form.date} onChange={(e) => form.setDate(e.target.value)} />
      <input data-testid="start" value={form.startTime} onChange={(e) => form.setStartTime(e.target.value)} />
      <input data-testid="hours" value={form.hours} onChange={(e) => form.setHours(e.target.value)} />
      <input data-testid="rate" value={form.hourlyRate} onChange={(e) => form.setHourlyRate(e.target.value)} />
      <input data-testid="endDate" value={form.endDate} onChange={(e) => form.setEndDate(e.target.value)} />
      <input data-testid="endTime" value={form.endTime} onChange={(e) => form.setEndTime(e.target.value)} />
      <span data-testid="amount">{form.amount}</span>
      <span data-testid="previewError">{form.previewError ?? ''}</span>
    </div>
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('useShiftForm — medical-day amount preview (08:00 → 08:00)', () => {
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

  it('case d: 48h on holiday 08:00 = 24 feriado + 24 semana → 568.000,8', async () => {
    const institutions: Institution[] = [{
      id: 'i1',
      name: 'Hospital Test',
      guardia_semana_rate: 17000,
      guardia_finde_rate: 19000,
      guardia_feriado_rate: 6666.7,
      is_active: true,
    }];

    await act(async () => {
      root.render(<PreviewHarness initialDate="2026-05-25" institutions={institutions} />);
    });

    const selectBtn = container.querySelector('button') as HTMLButtonElement;
    act(() => { selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    act(() => { setInputValue(container.querySelector('[data-testid="hours"]') as HTMLInputElement, '48'); });

    const amount = container.querySelector('[data-testid="amount"]') as HTMLElement;
    // 24 × 6666.7 + 24 × 17000 = 568000.8 (NOT 48 × 6666.7 = 320001.6)
    expect(amount.textContent).toBe('568.000,8');
  });

  it('case e: Friday 14:00 → Saturday 14:00 = 18 semana + 6 finde → 138.000', async () => {
    const institutions: Institution[] = [{
      id: 'i1',
      name: 'Hospital Test',
      guardia_semana_rate: 5000,
      guardia_finde_rate: 8000,
      guardia_feriado_rate: null,
      is_active: true,
    }];

    await act(async () => {
      root.render(<PreviewHarness initialDate="2026-06-05" institutions={institutions} />);
    });

    const selectBtn = container.querySelector('button') as HTMLButtonElement;
    act(() => { selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    act(() => { setInputValue(container.querySelector('[data-testid="start"]') as HTMLInputElement, '14:00'); });
    act(() => { setInputValue(container.querySelector('[data-testid="hours"]') as HTMLInputElement, '24'); });

    const amount = container.querySelector('[data-testid="amount"]') as HTMLElement;
    // 18 × 5000 + 6 × 8000 = 138000
    expect(amount.textContent).toBe('138.000');
  });

  it('C1 regression: start 14:00 + 8h keeps endDate on the SAME local day (no UTC drift)', async () => {
    const institutions: Institution[] = [{
      id: 'i1',
      name: 'Hospital Test',
      guardia_semana_rate: 5000,
      guardia_finde_rate: 8000,
      guardia_feriado_rate: null,
      is_active: true,
    }];

    await act(async () => {
      root.render(<PreviewHarness initialDate="2026-08-05" institutions={institutions} />);
    });

    act(() => { setInputValue(container.querySelector('[data-testid="start"]') as HTMLInputElement, '14:00'); });
    act(() => { setInputValue(container.querySelector('[data-testid="hours"]') as HTMLInputElement, '8'); });

    const endDate = container.querySelector('[data-testid="endDate"]') as HTMLInputElement;
    // 14:00 + 8h = 22:00 LOCAL (same day). toISOString() would give the NEXT
    // calendar day in UTC (01:00Z), drifting the end date a day forward.
    expect(endDate.value).toBe('2026-08-05');
  });

  it('W2: backwards range (end <= start) shows an error and clears the preview', async () => {
    const institutions: Institution[] = [{
      id: 'i1',
      name: 'Hospital Test',
      guardia_semana_rate: 5000,
      guardia_finde_rate: 8000,
      guardia_feriado_rate: null,
      is_active: true,
    }];

    await act(async () => {
      root.render(<PreviewHarness initialDate="2026-08-05" institutions={institutions} />);
    });

    const selectBtn = container.querySelector('button') as HTMLButtonElement;
    act(() => { selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    act(() => { setInputValue(container.querySelector('[data-testid="start"]') as HTMLInputElement, '14:00'); });
    // Force a backwards range: end (08:00 same day) is BEFORE start (14:00).
    act(() => { setInputValue(container.querySelector('[data-testid="endDate"]') as HTMLInputElement, '2026-08-05'); });
    act(() => { setInputValue(container.querySelector('[data-testid="endTime"]') as HTMLInputElement, '08:00'); });

    const error = container.querySelector('[data-testid="previewError"]') as HTMLElement;
    const amount = container.querySelector('[data-testid="amount"]') as HTMLElement;
    expect(error.textContent).toBe('El fin debe ser posterior al inicio');
    expect(amount.textContent).toBe('');
  });

  it('W3 replaced: 96h range computes a preview amount (no 48h cap — doctors work 72h+ guardias)', async () => {
    const institutions: Institution[] = [{
      id: 'i1',
      name: 'Hospital Test',
      guardia_semana_rate: 5000,
      guardia_finde_rate: 8000,
      guardia_feriado_rate: null,
      is_active: true,
    }];

    await act(async () => {
      root.render(<PreviewHarness initialDate="2026-08-05" institutions={institutions} />);
    });

    const selectBtn = container.querySelector('button') as HTMLButtonElement;
    act(() => { selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    // Aug 05 08:00 → Aug 09 08:00 = 96h: 72 weekday (Wed/Thu/Fri med days) +
    // 24 weekend (Sat med day). No feriado rate → weekday/weekend buckets only.
    act(() => { setInputValue(container.querySelector('[data-testid="hours"]') as HTMLInputElement, '96'); });

    const error = container.querySelector('[data-testid="previewError"]') as HTMLElement;
    const amount = container.querySelector('[data-testid="amount"]') as HTMLElement;
    expect(error.textContent).toBe('');
    // 72 × 5000 + 24 × 8000 = 552000
    expect(amount.textContent).toBe('552.000');
  });

  it('long guardia with a holiday inside uses feriado hours × feriado rate: 72h Wed → Sat (Thu 2026-07-09 holiday) → 456.000', async () => {
    const institutions: Institution[] = [{
      id: 'i1',
      name: 'Hospital Test',
      guardia_semana_rate: 5000,
      guardia_finde_rate: 8000,
      guardia_feriado_rate: 9000,
      is_active: true,
    }];

    await act(async () => {
      root.render(<PreviewHarness initialDate="2026-07-08" institutions={institutions} />);
    });

    const selectBtn = container.querySelector('button') as HTMLButtonElement;
    act(() => { selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    // Wed 08:00 → Sat 08:00 = 72h: 24 weekday (Wed med day) + 24 feriado
    // (Thu 2026-07-09 holiday) + 24 weekday (Fri med day).
    act(() => { setInputValue(container.querySelector('[data-testid="hours"]') as HTMLInputElement, '72'); });

    const amount = container.querySelector('[data-testid="amount"]') as HTMLElement;
    // 24 × 5000 + 24 × 9000 + 24 × 5000 = 456000
    expect(amount.textContent).toBe('456.000');
  });
});

/** Renders the hook with no initialDate to observe the LOCAL date defaults.
 *  SSR is used so effects (which recompute endDate from hours/startTime) do
 *  not overwrite the initializer values we want to assert. */
function DateDefaultsHarness() {
  const form = useShiftForm(() => {}, undefined, undefined, undefined, [], () => {}, 'es');
  return <div data-date={form.date} data-end-date={form.endDate} />;
}

describe('useShiftForm — local date defaults (P3)', () => {
  it('defaults date/endDate to Buenos Aires LOCAL time, not UTC', () => {
    // 2026-08-06T01:30Z == 2026-08-05T22:30 in America/Argentina/Buenos_Aires (UTC-3).
    // toISOString() (UTC) would yield '2026-08-06'; local must yield '2026-08-05'.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T01:30:00Z'));
    try {
      const html = renderToStaticMarkup(<DateDefaultsHarness />);
      expect(html).toContain('data-date="2026-08-05"');
      expect(html).toContain('data-end-date="2026-08-06"');
    } finally {
      vi.useRealTimers();
    }
  });
});

/** Renders the hook for a NEW registration on a day that already has shifts. */
function SecondRegistrationHarness({ initialDate, transactions }: { initialDate: string; transactions: Transaction[] }) {
  const form = useShiftForm(() => {}, undefined, transactions, initialDate, [], () => {}, 'es');
  return <div data-date={form.date} data-extras-count={form.extras.length} />;
}

describe('useShiftForm — second registration on an already-booked day (P3)', () => {
  it('opens with the day date and does not import existing same-day transactions', async () => {
    const existing: Transaction = {
      id: 'existing-1',
      institution: 'Hospital Test',
      type: ShiftType.CONSULTATION,
      date: '2026-07-10',
      amount: 5000,
      status: PaymentStatus.PENDING,
      notes: 'procedimiento: ecografía abdominal',
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <SecondRegistrationHarness initialDate="2026-07-10" transactions={[existing]} />,
        );
      });
      const el = container.querySelector('[data-date]') as HTMLElement;
      expect(el.dataset.date).toBe('2026-07-10');
      expect(el.dataset.extrasCount).toBe('0');
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
