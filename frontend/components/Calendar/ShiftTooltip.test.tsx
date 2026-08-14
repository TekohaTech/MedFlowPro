import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShiftType, PaymentStatus, type Transaction, type Institution } from '../../types';
import { ShiftTooltip, type HoverInfo } from './ShiftTooltip';

const t = {
  feriado: 'Feriado',
  feriadoNacional: 'Feriado nacional',
  tipoGuardia: 'Guardia',
  tipoProced: 'Proced.',
  tipoExtra: 'Extra',
  tipoIntercons: 'Intercons.',
  pagadoBadge: '• Pagado',
  pendienteBadge: '• Pendiente',
  cubre: 'cubre',
  guardiaDe: 'Guardia de',
};

function hoverInfoFor(day: Date, shifts: Transaction[] = []): HoverInfo {
  return { x: 100, y: 100, day, shifts };
}

const institutions: Institution[] = [
  { id: 'i1', name: 'Madariaga', color: '#ef4444', is_active: true },
];

describe('ShiftTooltip holiday line', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('shows the holiday NAME on a feriado day', () => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 } as unknown as Window;
    const html = renderToStaticMarkup(
      <ShiftTooltip hoverInfo={hoverInfoFor(new Date(2026, 4, 25))} t={t} institutions={institutions} />,
    );
    expect(html).toContain('Día de la Revolución de Mayo');
  });

  it('shows no holiday line on a regular day', () => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 } as unknown as Window;
    const html = renderToStaticMarkup(
      <ShiftTooltip hoverInfo={hoverInfoFor(new Date(2026, 4, 26))} t={t} institutions={institutions} />,
    );
    expect(html).not.toContain('Día de la Revolución de Mayo');
    expect(html).not.toContain('Feriado');
  });
});

describe('ShiftTooltip — coverage guardias show no amount (double-counting fix)', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  const startDay = new Date(2026, 7, 5);

  function guardiaFor(overrides: Partial<Transaction>): Transaction {
    return {
      id: 'g1',
      institution: 'Madariaga',
      type: ShiftType.ACTIVE,
      date: '2026-08-05',
      endDate: '2026-08-06',
      startTime: '08:00',
      endTime: '08:00',
      amount: 500000,
      status: PaymentStatus.PENDING,
      ...overrides,
    };
  }

  it('shows the amount for a guardia that STARTS the hovered day', () => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 } as unknown as Window;
    const html = renderToStaticMarkup(
      <ShiftTooltip
        hoverInfo={hoverInfoFor(startDay, [guardiaFor({})])}
        t={t}
        institutions={institutions}
      />,
    );
    expect(html).toContain('$500.000');
    expect(html).not.toContain('cubre');
  });

  it('shows a coverage pill and NO amount when the guardia only COVERS the hovered day', () => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 } as unknown as Window;
    const covering = guardiaFor({ date: '2026-08-03', endDate: '2026-08-06' });
    const html = renderToStaticMarkup(
      <ShiftTooltip
        hoverInfo={hoverInfoFor(startDay, [covering])}
        t={t}
        institutions={institutions}
      />,
    );
    expect(html).toContain('cubre');
    expect(html).not.toContain('$500.000');
    // The range line is still shown for context
    expect(html).toContain('Guardia de 72h · 03/08 08:00 → 06/08 08:00');
  });
});
