import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { es } from 'date-fns/locale';
import { CalendarGrid } from './CalendarGrid';
import { ShiftType, PaymentStatus, Transaction, Institution } from '../../types';

const t = { feriado: 'Feriado' };

function renderGrid(
  year: number,
  month: number,
  transactions: Transaction[] = [],
  institutions: Institution[] = [],
): string {
  return renderToStaticMarkup(
    <CalendarGrid
      transactions={transactions}
      institutions={institutions}
      currentDate={new Date(year, month, 1)}
      selectedDay={new Date(year, month, 1)}
      locale={es}
      t={t}
      onDayClick={() => {}}
    />,
  );
}

function makeInstitution(overrides: Partial<Institution> = {}): Institution {
  return { id: 'i1', name: 'Madariaga', color: null, is_active: true, ...overrides };
}

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

describe('CalendarGrid holiday marking', () => {
  it('renders the holiday NAME pill on every national holiday of the month (May 2026 has 2: 01/05 and 25/05)', () => {
    const html = renderGrid(2026, 4); // mayo
    // The May 2026 grid spans Apr 26 – Jun 6; only the in-month holidays must be marked,
    // so each name appearing exactly once proves both holidays are marked AND trailing/leading cells are not.
    expect(html).toContain('Día del Trabajador');
    expect(html).toContain('Día de la Revolución de Mayo');
    expect(html.match(/Día del Trabajador/g)).toHaveLength(1);
    expect(html.match(/Día de la Revolución de Mayo/g)).toHaveLength(1);
  });

  it('renders no holiday pill in a month without national holidays (September 2026)', () => {
    const html = renderGrid(2026, 8);
    expect(html).not.toContain('Día del Trabajador');
    expect(html).not.toContain('Día de la Revolución de Mayo');
    expect(html).not.toContain('Navidad');
  });

  it('marks February 2026 on both Carnival days (16/02 and 17/02)', () => {
    const html = renderGrid(2026, 1);
    expect(html.match(/Carnaval/g)).toHaveLength(2);
  });
});

describe('CalendarGrid — guardias, not sums (double-counting fix)', () => {
  it('shows a multi-day guardia amount ONLY on its start day, never on coverage days', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // Start day 02/08 renders the amount TWICE now: desktop row + mobile
    // compact row. Coverage days (03/08, 04/08) still show NO amount.
    expect(html.match(/\$816k/g)).toHaveLength(2);
    // Filled dot on the start day: dots cluster + desktop row + mobile row
    expect(html.match(/background-color:#ef4444/g)).toHaveLength(3);
  });

  it('renders coverage days as ring dots with NO amount', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // Each coverage day (03/08 and 04/08) renders the ring dot TWICE: once in the
    // dots cluster (all breakpoints) and once in the desktop coverage row.
    expect(html.match(/border-color:#ef4444/g)).toHaveLength(4);
    // The start day (02/08) renders the FILLED dot three times
    // (cluster + desktop row + mobile compact row)
    expect(html.match(/background-color:#ef4444/g)).toHaveLength(3);
    // Coverage days never show an amount — only the start day's 2 spots do
    expect(html.match(/\$816k/g)).toHaveLength(2);
  });

  it('never sums a coverage guardia with a same-day guardia (the $1.020.007,92 bug)', () => {
    const tuesdayGuardia = guardia({
      id: 'g2',
      institution: 'Clínica',
      date: '2026-08-04',
      endDate: '2026-08-04',
      startTime: '08:00',
      endTime: '20:00',
      amount: 204000,
    });
    const html = renderGrid(
      2026, 7,
      [guardia(), tuesdayGuardia],
      [makeInstitution({ id: 'i1', name: 'Madariaga', color: '#ef4444' }), makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' })],
    );
    // Tuesday 04/08 used to show $1.020k (48h from Sunday + its own 12h) — now
    // each guardia shows its OWN amount, once per day-location (desktop + mobile)
    // but never summed.
    expect(html).not.toContain('$1.020k');
    expect(html.match(/\$816k/g)).toHaveLength(2); // 02/08: desktop + mobile
    expect(html.match(/\$204k/g)).toHaveLength(2); // 04/08: desktop + mobile
  });

  it('shows up to 2 start-day rows and a "+N" overflow indicator (desktop + mobile)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
      guardia({ id: 'c', date: '2026-08-05', endDate: '2026-08-05', amount: 300000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Desktop: rows $100k + $200k, then "+1" overflow. Mobile: $100k row + "+2".
    expect(html.match(/\$100k/g)).toHaveLength(2); // desktop row + mobile row
    expect(html).toContain('$200k');
    expect(html).not.toContain('$300k');
    expect(html).toContain('+1');
    expect(html).toContain('+2');
  });

  it('mobile compact row shows the FIRST starting guardia amount only', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Desktop shows both rows; mobile shows ONLY the first ($100k) + "+1" badge.
    expect(html.match(/\$100k/g)).toHaveLength(2); // desktop row + mobile row
    expect(html.match(/\$200k/g)).toHaveLength(1); // desktop row only
    expect(html).toContain('+1');
  });

  it('mobile row shows the first starting GUARDIA, not a same-day extra/procedure', () => {
    // The extra is logged BEFORE the guardia, so under the old startShifts[0]
    // logic its $50k would have shown as the guardia's amount on mobile.
    const earlyExtra: Transaction = {
      id: 'x1',
      institution: 'Madariaga',
      type: ShiftType.EXTRA,
      date: '2026-08-05',
      endDate: '2026-08-05',
      startTime: '08:00',
      endTime: '20:00',
      amount: 50000,
      status: PaymentStatus.PENDING,
    };
    const html = renderGrid(2026, 7, [
      earlyExtra,
      guardia({ id: 'g2', date: '2026-08-05', endDate: '2026-08-05', amount: 300000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Desktop renders both rows; mobile must render ONLY the guardia ($300k):
    expect(html.match(/\$300k/g)).toHaveLength(2); // desktop row + mobile row
    expect(html.match(/\$50k/g)).toHaveLength(1);  // desktop row only — never the mobile row
  });
});
