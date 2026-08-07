import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { es } from 'date-fns/locale';
import { CalendarGrid } from './CalendarGrid';

const t = { feriado: 'Feriado' };

function renderGrid(year: number, month: number): string {
  return renderToStaticMarkup(
    <CalendarGrid
      transactions={[]}
      currentDate={new Date(year, month, 1)}
      selectedDay={new Date(year, month, 1)}
      locale={es}
      t={t}
      onDayClick={() => {}}
    />,
  );
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
