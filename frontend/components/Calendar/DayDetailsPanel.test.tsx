// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShiftType, PaymentStatus, type Transaction, type Institution } from '../../types';
import { DayDetailsPanel } from './DayDetailsPanel';

const t = {
  feriadoNacional: 'Feriado nacional',
  hoy: 'Hoy',
  turnos: 'Turnos',
  turno: 'Turno',
  registrados: 'registrados',
  registrado: 'registrado',
  guardiaDe: 'Guardia de',
  editar: 'Editar',
  eliminar: 'Eliminar',
  cancelar: 'Cancelar',
  registrar: 'Registrar',
  cobrado: 'Cobrado',
  pendiente: 'Pendiente',
  sinRegistros: 'Sin registros',
  tocaParaAnadir: 'Tocá para añadir actividad',
  tipoGuardia: 'Guardia',
  tipoProced: 'Proced.',
  tipoExtra: 'Extra',
  tipoIntercons: 'Intercons.',
  pagadoBadge: '• Pagado',
  pendienteBadge: '• Pendiente',
  cubreEsteDia: 'Cubre este día',
  eliminarActividad: 'Eliminar actividad',
  eliminarActividadMsg: '¿Eliminar esta actividad? No se puede deshacer.',
};

function renderPanel(day: Date): string {
  return renderToStaticMarkup(
    <DayDetailsPanel
      selectedDay={day}
      shifts={[]}
      institutions={[]}
      t={t}
      locale={es}
      onOpenForm={() => {}}
      onDelete={() => {}}
    />,
  );
}

const guardia: Transaction = {
  id: 'g1',
  institution: 'Hospital Test',
  type: ShiftType.ACTIVE,
  date: '2026-08-05',
  endDate: '2026-08-06',
  startTime: '22:00',
  endTime: '08:00',
  amount: 100000,
  status: PaymentStatus.PENDING,
};

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

describe('DayDetailsPanel — persistent "+ Registrar" button (P2)', () => {
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

  function findRegisterButton(): HTMLButtonElement | null {
    return Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.replace(/\s+/g, ' ').trim() === '+ Registrar',
    ) ?? null;
  }

  function mountPanel(day: Date, shifts: Transaction[]): Array<string | undefined> {
    const calls: Array<string | undefined> = [];
    act(() => {
      root.render(
        <DayDetailsPanel
          selectedDay={day}
          shifts={shifts}
          institutions={[]}
          t={t}
          locale={es}
          onOpenForm={(date) => { calls.push(date); }}
          onDelete={() => {}}
        />,
      );
    });
    return calls;
  }

  it('renders the button with activities and opens the form with the formatted day', () => {
    const day = new Date(2026, 7, 5);
    const calls = mountPanel(day, [guardia]);

    const btn = findRegisterButton();
    expect(btn).not.toBeNull();

    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(calls).toEqual([format(day, 'yyyy-MM-dd')]);
  });

  it('keeps the register button visible when the selected day is today with activities', () => {
    mountPanel(new Date(), [guardia]);
    expect(findRegisterButton()).not.toBeNull();
  });
});

describe('DayDetailsPanel — guardia range readability (P1)', () => {
  it('renders the human-readable range and allows wrapping instead of truncation', () => {
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(html).toContain('Guardia de 10h · 05/08 22:00 → 06/08 08:00');
    const rangeSpan = html.match(/<span[^>]*>Guardia de 10h · 05\/08 22:00 → 06\/08 08:00<\/span>/);
    expect(rangeSpan).not.toBeNull();
    // Must NOT force single-line truncation: allow wrap on narrow panels
    expect(rangeSpan![0]).not.toContain('whitespace-nowrap');
    expect(rangeSpan![0]).toContain('leading-snug');
    // Cards carry overflow-hidden as a safety net —
    // scoped to the CARD className, not a blanket html-wide assertion.
    const card = html.match(/<div class="[^"]*p-4 rounded-\[2rem\][^"]*overflow-hidden[^"]*">/);
    expect(card).not.toBeNull();
  });
});

describe('DayDetailsPanel — turn counter counts visible cards, not sub-items', () => {
  it('shows 1 turno for a guardia with a nested sub-item, not 2', () => {
    const sub: Transaction = {
      id: 's1',
      institution: 'Hospital Test',
      type: ShiftType.PASSIVE,
      date: '2026-08-05',
      endDate: '2026-08-05',
      amount: 15000,
      status: PaymentStatus.PENDING,
      notes: 'interconsulta',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia, sub]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(html).toContain('1 Turno registrado');
    expect(html).not.toContain('2 Turnos registrados');
  });
});

describe('DayDetailsPanel — sub-item overlap guards (P1)', () => {
  it('keeps break-words on concept text and nowrap on amount so long words never overlap', () => {
    const sub: Transaction = {
      id: 's2',
      institution: 'Hospital Test',
      type: ShiftType.CONSULTATION,
      date: '2026-08-05',
      endDate: '2026-08-05',
      amount: 20000.87,
      status: PaymentStatus.PENDING,
      conceptName: 'Intervención/Procedimiento ambulatorio mayor',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia, sub]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    const concept = html.match(/Intervención\/Procedimiento ambulatorio mayor/);
    expect(concept).not.toBeNull();
    expect(concept![0]).not.toBeNull();
    const conceptSpan = html.match(/<span[^>]*>[^<]*Intervención\/Procedimiento ambulatorio mayor[^<]*<\/span>/);
    expect(conceptSpan![0]).toContain('break-words');
    const amountSpan = html.match(/<span[^>]*>\$20\.000,87<\/span>/);
    expect(amountSpan![0]).toContain('whitespace-nowrap');
  });

  it('shows the procedure name on a standalone card even when notes is empty', () => {
    const proc: Transaction = {
      id: 'p1',
      institution: 'Madariaga',
      type: ShiftType.CONSULTATION,
      date: '2026-08-05',
      endDate: '2026-08-05',
      amount: 19000,
      status: PaymentStatus.PENDING,
      procedureName: 'ecocardiograma',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[proc]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(html).toContain('ecocardiograma');
  });

  it('shows which day the sub-item was done and its guardia range', () => {
    const sub: Transaction = {
      id: 's3',
      institution: 'Hospital Test',
      type: ShiftType.PASSIVE,
      date: '2026-08-05',
      endDate: '2026-08-05',
      amount: 15000,
      status: PaymentStatus.PENDING,
      notes: 'interconsulta cardio',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia, sub]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    // Sub-item detail line: "<day label> · Guardia de 10h · 05/08 22:00 → 06/08 08:00"
    expect(html).toContain('· Guardia de 10h · 05/08 22:00 → 06/08 08:00');
  });

  it('shows the sub-item startTime next to its day when the extra has a time', () => {
    const sub: Transaction = {
      id: 's4',
      institution: 'Hospital Test',
      type: ShiftType.PASSIVE,
      date: '2026-08-05',
      startTime: '14:30',
      endDate: '2026-08-05',
      amount: 12000,
      status: PaymentStatus.PENDING,
      notes: 'interconsulta neuro',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia, sub]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    // Detail line appends the time after the day label: "<day> 14:30 · Guardia..."
    expect(html).toContain('14:30 · Guardia de 10h · 05/08 22:00 → 06/08 08:00');
  });
});

describe('DayDetailsPanel — sub-items are never hidden with 2+ guardias same institution/day', () => {
  it('renders non-guardia items as standalone cards when the group has multiple guardias', () => {
    const guardia2: Transaction = {
      id: 'g2',
      institution: 'Hospital Test',
      type: ShiftType.ACTIVE,
      date: '2026-08-05',
      endDate: '2026-08-06',
      startTime: '08:00',
      endTime: '20:00',
      amount: 80000,
      status: PaymentStatus.PENDING,
    };
    const interconsulta: Transaction = {
      id: 'ic1',
      institution: 'Hospital Test',
      type: ShiftType.PASSIVE,
      date: '2026-08-05',
      endDate: '2026-08-05',
      amount: 15000,
      status: PaymentStatus.PENDING,
      notes: 'interconsulta cardio',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia, guardia2, interconsulta]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    // The interconsulta must be visible (as its own card), never dropped
    expect(html).toContain('interconsulta cardio');
    // 3 visible cards (2 guardias + 1 interconsulta) → counter shows 3
    expect(html).toContain('3 Turnos registrados');
    expect(html).not.toContain('2 Turnos registrados');
  });
});

describe('DayDetailsPanel — coverage contributes $0 (double-counting fix)', () => {
  const coverageGuardia: Transaction = {
    id: 'g-cov',
    institution: 'Otro Sanatorio',
    type: ShiftType.ACTIVE,
    date: '2026-08-04',
    endDate: '2026-08-05',
    startTime: '08:00',
    endTime: '08:00',
    amount: 816007.92,
    status: PaymentStatus.PENDING,
  };

  it('sums ONLY start-day amounts in the paid/pending badges', () => {
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[guardia, coverageGuardia]}
        institutions={[]}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    // guardia starts 05/08 ($100k); coverageGuardia covers 05/08 but must add $0
    expect(html).toContain('Pendiente: $100k');
    expect(html).not.toContain('Pendiente: $916k');
  });

  it('shows a coverage card with details but NO amount', () => {
    const institutions: Institution[] = [
      { id: 'i2', name: 'Otro Sanatorio', color: '#3b82f6', is_active: true },
    ];
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[coverageGuardia]}
        institutions={institutions}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(html).toContain('comenzó 04/08 08:00 → 05/08 08:00');
    expect(html).toContain('Cubre este día');
    expect(html).not.toContain('816.007,92');
    // Pure coverage day → badges show $0, proving the amount is never counted twice
    expect(html).toContain('Pendiente: $0k');
    // Institution color accent is rendered on the coverage card
    expect(html).toContain('background-color:#3b82f6');
  });

  it('hides sub-item amounts nested inside a coverage card', () => {
    const institutions: Institution[] = [
      { id: 'i2', name: 'Otro Sanatorio', color: '#3b82f6', is_active: true },
    ];
    // The sub-item shares the guardia's START date + institution so groupShifts
    // nests it inside the coverage card (it was done on the coverage day but is
    // saved with the guardia's start date).
    const sub: Transaction = {
      id: 'sub-cov',
      institution: 'Otro Sanatorio',
      type: ShiftType.PASSIVE,
      date: '2026-08-04',
      endDate: '2026-08-04',
      amount: 25000,
      status: PaymentStatus.PENDING,
      notes: 'interconsulta cardio',
    };
    const html = renderToStaticMarkup(
      <DayDetailsPanel
        selectedDay={new Date(2026, 7, 5)}
        shifts={[coverageGuardia, sub]}
        institutions={institutions}
        t={t}
        locale={es}
        onOpenForm={() => {}}
        onDelete={() => {}}
      />,
    );
    // The sub-item is visible (with its note) but its amount is hidden
    expect(html).toContain('interconsulta cardio');
    expect(html).not.toContain('25.000');
  });
});
