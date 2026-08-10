import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
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
};

function hoverInfoFor(day: Date): HoverInfo {
  return { x: 100, y: 100, day, shifts: [] };
}

describe('ShiftTooltip holiday line', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('shows the holiday NAME on a feriado day', () => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 } as unknown as Window;
    const html = renderToStaticMarkup(
      <ShiftTooltip hoverInfo={hoverInfoFor(new Date(2026, 4, 25))} t={t} />,
    );
    expect(html).toContain('Día de la Revolución de Mayo');
  });

  it('shows no holiday line on a regular day', () => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 } as unknown as Window;
    const html = renderToStaticMarkup(
      <ShiftTooltip hoverInfo={hoverInfoFor(new Date(2026, 4, 26))} t={t} />,
    );
    expect(html).not.toContain('Día de la Revolución de Mayo');
    expect(html).not.toContain('Feriado');
  });
});
