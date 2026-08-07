import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { es } from 'date-fns/locale';
import { DayDetailsPanel } from './DayDetailsPanel';

const t = {
  feriadoNacional: 'Feriado nacional',
  hoy: 'Hoy',
  turnos: 'Turnos',
  editar: 'Editar',
  eliminar: 'Eliminar',
};

function renderPanel(day: Date): string {
  return renderToStaticMarkup(
    <DayDetailsPanel
      selectedDay={day}
      shifts={[]}
      t={t}
      locale={es}
      onOpenForm={() => {}}
      onDelete={() => {}}
    />,
  );
}

describe('DayDetailsPanel holiday banner', () => {
  it('shows the holiday NAME when the selected day is a feriado', () => {
    const html = renderPanel(new Date(2026, 4, 25)); // Día de la Revolución de Mayo
    expect(html).toContain('Día de la Revolución de Mayo');
  });

  it('hides the holiday banner for a regular day', () => {
    const html = renderPanel(new Date(2026, 4, 26));
    expect(html).not.toContain('Día de la Revolución de Mayo');
    expect(html).not.toContain('Feriado nacional');
  });
});
