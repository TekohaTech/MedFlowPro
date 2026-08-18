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
    // Start day 02/08 renders the amount ONCE, inside the duration line (the
    // amount span is CSS-hidden on mobile — hidden lg:inline).
    expect(html.match(/\$816k/g)).toHaveLength(1);
    // background-color:#ef4444 = 5: start day 02/08 (duration dot + duration
    // segment) + one segment per coverage day (03/08, 04/08) + the vertical
    // end marker on the LAST day (04/08). The old desktop cluster dot and
    // mini-row dot are GONE — the duration line is the single representation.
    // Segments use the SAME plain institution hex as the dot (opaque, no
    // color-mix).
    expect(html.match(/background-color:#ef4444/g)).toHaveLength(5);
  });

  it('coverage days render the duration segment with NO amount and NO ring dots', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // The old desktop ring-dot cluster is GONE — coverage is expressed ONLY by
    // the line's segment in the SAME plain hex as the dot.
    expect((html.match(/border-color:#ef4444/g) ?? [])).toHaveLength(0);
    // background-color:#ef4444 = 5: start day 02/08 (dot + segment) + one
    // segment per coverage day (03/08, 04/08) + the end marker on 04/08.
    expect(html.match(/background-color:#ef4444/g)).toHaveLength(5);
    // Coverage days never show an amount — only the start day's line does.
    expect(html.match(/\$816k/g)).toHaveLength(1);
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
    // each guardia shows its OWN amount, once per start day, but never summed.
    expect(html).not.toContain('$1.020k');
    expect(html.match(/\$816k/g)).toHaveLength(1); // 02/08: duration-amount span
    expect(html.match(/\$204k/g)).toHaveLength(1); // 04/08: duration-amount span
  });

  it('no "+N" overflow anymore — 3 guardias of the SAME institution collapse into ONE line with the FIRST amount ($100k)', () => {
    // Same institution (Madariaga): dedupe → ONE duration line. The amount
    // shown is the FIRST ACTIVE start transaction of the day for that
    // institution; the other two amounts never render. The count badge still
    // counts all three.
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
      guardia({ id: 'c', date: '2026-08-05', endDate: '2026-08-05', amount: 300000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    expect(html.match(/data-testid="duration-line"/g)).toHaveLength(1);
    expect(html.match(/\$100k/g)).toHaveLength(1); // first ACTIVE start tx only
    expect(html).not.toContain('$200k');
    expect(html).not.toContain('$300k');
    expect(html).not.toContain('>+1');
    expect(html).toContain('rounded-md shrink-0">3</span>');
  });

  it('mobile count badge shows "2" for two starting guardias (no +N on mobile)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', institution: 'Clínica', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
    ], [
      makeInstitution({ id: 'i1', name: 'Madariaga', color: '#ef4444' }),
      makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' }),
    ]);
    // Two DIFFERENT institutions → two lines, each with its own amount
    // (hidden lg:inline — CSS-hidden on mobile). Mobile shows the count badge.
    expect(html.match(/\$100k/g)).toHaveLength(1); // duration-amount span
    expect(html.match(/\$200k/g)).toHaveLength(1); // duration-amount span
    expect(html).toContain('rounded-md shrink-0">2</span>');
    expect(html).not.toContain('>+1');
  });

  it('mobile count badge counts GUARDIAS only — a same-day extra/procedure does not count', () => {
    // The extra is logged BEFORE the guardia: the count must be 1 (the
    // guardia), never 2, and no amount reaches the mobile row.
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
    expect(html).toContain('rounded-md shrink-0">1</span>');
    expect(html.match(/\$300k/g)).toHaveLength(1); // duration-amount span
    expect((html.match(/\$50k/g) ?? [])).toHaveLength(0);  // extras render NO line and NO amount
  });
});

describe('CalendarGrid — duration lines (mobile + desktop)', () => {
  it('single-day guardia: dot + amount + segment WITH the end marker (same opaque color)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Single-day guardia → exactly ONE cell with an active institution.
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-dot"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-segment"/g)).toHaveLength(1);
    // Not active tomorrow → the segment stops short (mr-1 rounded-r-full) and
    // the short VERTICAL end marker marks "termina acá".
    expect(html).toContain('class="h-[3px] flex-1 min-w-0 mr-1 rounded-r-full"');
    expect(html).not.toContain('class="h-[3px] flex-1 min-w-0"');
    expect(html.match(/data-testid="duration-end-marker"/g)).toHaveLength(1);
    // The line row has NO horizontal gap on mobile — the dot is flush against
    // the segment (the line comes directly out of the dot). On DESKTOP the
    // amount span renders, so the row adds lg:gap-1 (the gap class is
    // lg-scoped: on mobile the amount is display:none and a base gap would
    // still apply between dot and segment, breaking the flush look). The parent
    // container has a 2px flex gap and renders ONE child per SLOT — a real
    // line or an invisible h-2 spacer — so slot s always sits at (s-1)*(8px+2px)
    // from the container top (a single line at slot 1 has NO preceding
    // children → no spacer, no gap before it). Every row has a UNIFORM 8px
    // height (h-2) so the 3px segment sits on the SAME axis in every cell —
    // the line stays straight across multi-day guardias. A START day adds
    // pl-1.5 so the dot sits slightly away from the cell's left edge.
    expect(html).toContain('class="flex items-center w-full min-w-0 h-2 pl-1.5 lg:gap-1"');
    // The desktop amount renders INSIDE the line (CSS-hidden on mobile).
    expect(html.match(/\$100k/g)).toHaveLength(1);
    // The segment and the end marker carry the SAME opaque institution color as
    // the dot — plain hex, no translucency, no color-mix (the 1px grid borders
    // must not show).
    const segmentTags = html.match(/data-testid="duration-segment"[^>]*>/g) ?? [];
    expect(segmentTags).toHaveLength(1);
    expect(segmentTags[0]).toContain('background-color:#ef4444');
    const markerTags = html.match(/data-testid="duration-end-marker"[^>]*>/g) ?? [];
    expect(markerTags).toHaveLength(1);
    expect(markerTags[0]).toContain('background-color:#ef4444');
    expect(html).not.toContain('color-mix');
    expect(html).not.toContain('opacity:0.3');
  });

  it('multi-day guardia: dot only on start, end marker only on the LAST day', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // 02/08 start (dot, continuous line), 03/08 middle (no dot, continuous),
    // 04/08 last day (no dot, end marker).
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(3);
    expect(html.match(/data-testid="duration-dot"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-segment"/g)).toHaveLength(3);
    expect(html.match(/class="h-\[3px\] flex-1 min-w-0 mr-1 rounded-r-full"/g)).toHaveLength(1);
    expect(html.match(/class="h-\[3px\] flex-1 min-w-0"/g)).toHaveLength(2);
    // End marker ONLY on 04/08 (the last day of the 48h guardia).
    expect(html.match(/data-testid="duration-end-marker"/g)).toHaveLength(1);
  });

  it('desktop amount sits inside the line (hidden lg:inline) — start day only, never on coverage days', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    const amountTags = html.match(/data-testid="duration-amount"[^>]*>/g) ?? [];
    expect(amountTags).toHaveLength(1);
    expect(amountTags[0]).toContain('hidden lg:inline');
    expect(html.match(/\$816k/g)).toHaveLength(1);
    // Coverage-only cells (03/08, 04/08) contain NO amount span.
    const first = html.indexOf('data-testid="duration-lines"');
    const second = html.indexOf('data-testid="duration-lines"', first + 1);
    const third = html.indexOf('data-testid="duration-lines"', second + 1);
    expect(html.slice(first, second)).toContain('data-testid="duration-amount"'); // 02/08
    expect(html.slice(second, third)).not.toContain('data-testid="duration-amount"'); // 03/08
    expect(html.slice(third)).not.toContain('data-testid="duration-amount"'); // 04/08 +
  });

  it('end marker uses the SAME institution color as the dot and segment', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    const markerTags = html.match(/data-testid="duration-end-marker"[^>]*>/g) ?? [];
    expect(markerTags).toHaveLength(1); // only the last day (04/08)
    expect(markerTags[0]).toContain('background-color:#ef4444');
  });

  it('guardia ending the same day another STARTS (same institution) renders TWO lines — end marker line + dot line', () => {
    // A: Madariaga 02/08 → 05/08. B: Madariaga 05/08 → 05/08 (1-day).
    // Day 05/08: A ENDS and B STARTS — must NOT fuse into one 1-day-looking
    // line. Two lines: A (segment + end marker, NO dot) then B (dot + marker).
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05', amount: 400000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Containers: 02/08 (A starts), 03/08, 04/08, 05/08 (A ends + B starts).
    const first = html.indexOf('data-testid="duration-lines"');
    const second = html.indexOf('data-testid="duration-lines"', first + 1);
    const third = html.indexOf('data-testid="duration-lines"', second + 1);
    const fourth = html.indexOf('data-testid="duration-lines"', third + 1);
    const day5 = html.slice(fourth);
    expect(day5.match(/data-testid="duration-line"/g)).toHaveLength(2);
    const l1Start = day5.indexOf('data-testid="duration-line"');
    const l2Start = day5.indexOf('data-testid="duration-line"', l1Start + 1);
    const line1 = day5.slice(l1Start, l2Start); // A: ends today, does NOT start
    const line2 = day5.slice(l2Start);          // B: starts today (1-day)
    expect(line1).not.toContain('data-testid="duration-dot"');
    expect(line1).toContain('data-testid="duration-end-marker"');
    expect(line1).not.toContain('$400k');
    expect(line2).toContain('data-testid="duration-dot"');
    expect(line2).toContain('data-testid="duration-end-marker"'); // B is 1-day
    expect(line2).toContain('$200k');
    // A's amount lives ONLY on A's own start day (02/08).
    const day2 = html.slice(first, second);
    expect(day2).toContain('$400k');
    expect(html.match(/\$400k/g)).toHaveLength(1);
    expect(html.match(/\$200k/g)).toHaveLength(1);
    // The count badge counts B (1 starting guardia on 05/08), not A.
    expect(day5).toContain('rounded-md shrink-0">1</span>');
  });

  it('end marker is PER GUARDIA: A ends today while B (same institution) continues tomorrow → only A\'s line has the marker', () => {
    // A: Madariaga 02/08 → 05/08. B: Madariaga 05/08 → 07/08 (continues).
    // Day 05/08: A ENDS (marker) and B STARTS (dot, NO marker — B covers
    // tomorrow). The old isLastDay-by-tomorrow logic would have hidden A's
    // marker because tomorrow has coverage.
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05', amount: 400000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-07', amount: 200000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Containers: 02/08, 03/08, 04/08, 05/08, 06/08, 07/08.
    const first = html.indexOf('data-testid="duration-lines"');
    const second = html.indexOf('data-testid="duration-lines"', first + 1);
    const third = html.indexOf('data-testid="duration-lines"', second + 1);
    const fourth = html.indexOf('data-testid="duration-lines"', third + 1);
    const fifth = html.indexOf('data-testid="duration-lines"', fourth + 1);
    const sixth = html.indexOf('data-testid="duration-lines"', fifth + 1);
    const day5 = html.slice(fourth, fifth);
    expect(day5.match(/data-testid="duration-line"/g)).toHaveLength(2);
    const l1Start = day5.indexOf('data-testid="duration-line"');
    const l2Start = day5.indexOf('data-testid="duration-line"', l1Start + 1);
    const line1 = day5.slice(l1Start, l2Start); // A: ends today
    const line2 = day5.slice(l2Start);          // B: starts today, continues
    expect(line1).toContain('data-testid="duration-end-marker"');
    expect(line1).not.toContain('data-testid="duration-dot"');
    expect(line2).toContain('data-testid="duration-dot"');
    expect(line2).not.toContain('data-testid="duration-end-marker"');
    expect(line2).not.toContain('mr-1 rounded-r-full');
    // Day 05 has EXACTLY ONE end marker (A's) — B's line has none.
    expect(day5.match(/data-testid="duration-end-marker"/g)).toHaveLength(1);
    // Across the whole grid: TWO end markers — A's on 05/08 and B's own on
    // 07/08 (B still gets its marker on ITS end day; per-guardia semantics).
    expect(html.match(/data-testid="duration-end-marker"/g)).toHaveLength(2);
    // B's line continues through 06/08 (no dot, no marker)…
    const day6 = html.slice(fifth, sixth);
    expect(day6.match(/data-testid="duration-line"/g)).toHaveLength(1);
    expect(day6).not.toContain('data-testid="duration-end-marker"');
    expect(day6).not.toContain('data-testid="duration-dot"');
    // …and B ends on 07/08 with its own marker (no dot, no amount).
    const day7 = html.slice(sixth);
    expect(day7.match(/data-testid="duration-end-marker"/g)).toHaveLength(1);
    expect(day7).not.toContain('data-testid="duration-dot"');
    // Each amount appears exactly once, on its own start day.
    expect(html.match(/\$400k/g)).toHaveLength(1);
    expect(html.match(/\$200k/g)).toHaveLength(1);
  });

  it('distinct institutions ending/starting the same day stay separate lines (no cross-institution merge)', () => {
    // A: Madariaga 02/08 → 05/08. C: Clínica 05/08 → 05/08 (1-day).
    // Day 05/08: two institutions → two lines, each with its own behavior.
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05', amount: 400000 }),
      guardia({ id: 'c', institution: 'Clínica', date: '2026-08-05', endDate: '2026-08-05', amount: 150000 }),
    ], [
      makeInstitution({ color: '#ef4444' }),
      makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' }),
    ]);
    // Containers: 02/08, 03/08, 04/08, 05/08.
    const first = html.indexOf('data-testid="duration-lines"');
    const second = html.indexOf('data-testid="duration-lines"', first + 1);
    const third = html.indexOf('data-testid="duration-lines"', second + 1);
    const fourth = html.indexOf('data-testid="duration-lines"', third + 1);
    const day5 = html.slice(fourth);
    expect(day5.match(/data-testid="duration-line"/g)).toHaveLength(2);
    const l1Start = day5.indexOf('data-testid="duration-line"');
    const l2Start = day5.indexOf('data-testid="duration-line"', l1Start + 1);
    const line1 = day5.slice(l1Start, l2Start); // Madariaga (min start 02/08 → first)
    const line2 = day5.slice(l2Start);          // Clínica (starts + ends today)
    expect(line1).toContain('background-color:#ef4444');
    expect(line1).not.toContain('data-testid="duration-dot"');
    expect(line1).toContain('data-testid="duration-end-marker"');
    expect(line2).toContain('background-color:#3b82f6');
    expect(line2).toContain('data-testid="duration-dot"');
    expect(line2).toContain('data-testid="duration-end-marker"'); // C is 1-day
    expect(html.match(/\$400k/g)).toHaveLength(1); // A: start day 02/08 only
    expect(html.match(/\$150k/g)).toHaveLength(1); // C: start day 05/08 only
  });

  it('container spans the full cell width PLUS the 1px grid gap (-mx-[9px] + widened) above the grid background (relative z-[5])', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // w-[calc(100%+18px)] WIDENS the box 9px past the cell's content box on each
    // side and -mx-[9px] shifts it onto that area: the box spans from 1px over
    // the LEFT gap (cell's p-2 = 8px + 1px gap) to 1px over the RIGHT gap, so
    // each segment overlaps the grid line — and with z-[5] paints OVER it.
    // (width:100% alone would only SHIFT the box, leaving a 17px hole at every
    // cell boundary — the reason the guardia line looked cut on mobile.)
    // The container is NOT lg:hidden — the duration line is the single
    // representation of guardias at ALL breakpoints.
    expect(html).toContain('class="flex flex-col gap-[2px] mt-1 -mx-[9px] w-[calc(100%+18px)] min-w-0 relative z-[5]"');
  });

  it('grid "lines" are the grid background in the 1px gap (gap-px), NOT cell borders — cells paint an opaque base so the z-indexed line crosses them', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // The days grid draws its 1px lines as its OWN background showing through
    // the gap between cells (gap-px) — NOT divide borders on the cells — so any
    // z-indexed child (the duration lines) paints OVER the grid lines.
    expect(html).toContain('class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700"');
    expect(html).not.toContain('divide-x divide-y');
    // Cells paint their own opaque background so the grid background only shows
    // in the 1px gaps (not through the cells).
    expect(html).toContain('bg-white dark:bg-slate-800 min-h-[90px] lg:min-h-[120px] p-2 lg:p-3 transition-all cursor-pointer relative flex flex-col');
  });

  it('two institutions starting the same day render 2 stacked lines with their colors', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000, institution: 'Clínica' }),
    ], [
      makeInstitution({ color: '#ef4444' }),
      makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' }),
    ]);
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-line"/g)).toHaveLength(2);
    expect(html.match(/data-testid="duration-dot"/g)).toHaveLength(2);
    // Each segment is the SAME opaque hex as its institution dot.
    const segmentTags = html.match(/data-testid="duration-segment"[^>]*>/g) ?? [];
    expect(segmentTags).toHaveLength(2);
    expect(segmentTags[0]).toContain('background-color:#ef4444');
    expect(segmentTags[1]).toContain('background-color:#3b82f6');
  });

  it('3 guardias from 3 different institutions starting the same day render 3 lines (NO cap of 2) and the count badge shows "3"', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000, institution: 'Clínica' }),
      guardia({ id: 'c', date: '2026-08-05', endDate: '2026-08-05', amount: 300000, institution: 'Hospital' }),
    ], [
      makeInstitution({ color: '#ef4444' }),
      makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' }),
      makeInstitution({ id: 'i3', name: 'Hospital', color: '#f59e0b' }),
    ]);
    // EVERY institution gets a line (no cap) — 3 dots, 3 segments.
    expect(html.match(/data-testid="duration-line"/g)).toHaveLength(3);
    expect(html.match(/data-testid="duration-dot"/g)).toHaveLength(3);
    expect(html.match(/data-testid="duration-segment"/g)).toHaveLength(3);
    // The count badge reflects all 3 starting guardias.
    expect(html).toContain('rounded-md shrink-0">3</span>');
    // No "+N" overflow anymore — each line carries its OWN amount, once each.
    expect(html).not.toContain('>+1');
    expect(html.match(/\$100k/g)).toHaveLength(1);
    expect(html.match(/\$200k/g)).toHaveLength(1);
    expect(html.match(/\$300k/g)).toHaveLength(1);
  });

  it('two starting guardias from the SAME institution render a single line (dedupe)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Dedupe by institution NAME: both guardias are Madariaga → one line.
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-line"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-dot"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-segment"/g)).toHaveLength(1);
  });

  it('coverage-only days render the segment WITHOUT a dot and never an amount', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // 02/08 = start day (dot + segment), 03/08 + 04/08 = coverage-only
    // (segment only, continuing the line across cells).
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(3);
    expect(html.match(/data-testid="duration-dot"/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-segment"/g)).toHaveLength(3);
    // All 3 segments (02/08, 03/08, 04/08) use the SAME opaque hex as the dot.
    const segmentTags = html.match(/data-testid="duration-segment"[^>]*>/g) ?? [];
    expect(segmentTags).toHaveLength(3);
    segmentTags.forEach(tag => expect(tag).toContain('background-color:#ef4444'));
    // The amount still appears ONLY on the start day, inside the line's
    // duration-amount span (hidden lg:inline).
    expect(html.match(/\$816k/g)).toHaveLength(1);
  });

  it('a guardia starting mid-way renders BELOW the ongoing one (earliest-start order, no cap)', () => {
    // A: Madariaga 02/08 → 04/08 (3 days). B: Clínica 03/08 → 04/08 (2 days).
    // C: Hospital 04/08 → 04/08 (1 day, starts LAST → bottom line).
    const html = renderGrid(2026, 7, [
      guardia(),
      guardia({ id: 'b', institution: 'Clínica', date: '2026-08-03', endDate: '2026-08-04', startTime: '08:00', endTime: '20:00', amount: 204000 }),
      guardia({ id: 'c', institution: 'Hospital', date: '2026-08-04', endDate: '2026-08-04', startTime: '08:00', endTime: '20:00', amount: 150000 }),
    ], [
      makeInstitution({ color: '#ef4444' }),
      makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' }),
      makeInstitution({ id: 'i3', name: 'Hospital', color: '#f59e0b' }),
    ]);
    // Containers: 02/08 (A), 03/08 (A + B), 04/08 (A + B + C).
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(3);
    // Day 03/08 = SECOND container: A (ongoing, no dot) on top, B (dot) below.
    const first = html.indexOf('data-testid="duration-lines"');
    const second = html.indexOf('data-testid="duration-lines"', first + 1);
    const third = html.indexOf('data-testid="duration-lines"', second + 1);
    const day3 = html.slice(second, third);
    const day3Segments = day3.match(/data-testid="duration-segment"[^>]*>/g) ?? [];
    expect(day3Segments).toHaveLength(2);
    expect(day3Segments[0]).toContain('#ef4444'); // A first (top)
    expect(day3Segments[1]).toContain('#3b82f6'); // B second (bottom)
    const day3Dots = day3.match(/data-testid="duration-dot"[^>]*>/g) ?? [];
    expect(day3Dots).toHaveLength(1);
    expect(day3Dots[0]).toContain('#3b82f6'); // only B starts today
    // Neither A nor B ends on 03/08 (both cover 04/08) → no end markers.
    expect(day3).not.toContain('mr-1 rounded-r-full');
    expect(day3).not.toContain('data-testid="duration-end-marker"');
    // Day 04/08 = THIRD container: A + B (ongoing) + C (dot) → 3 lines in
    // earliest-start order, all with end markers (nothing active tomorrow).
    const day4 = html.slice(third);
    const day4Segments = day4.match(/data-testid="duration-segment"[^>]*>/g) ?? [];
    expect(day4Segments.map(tag => tag.match(/#[0-9a-f]{6}/)?.[0]))
      .toEqual(['#ef4444', '#3b82f6', '#f59e0b']);
    expect(day4.match(/class="h-\[3px\] flex-1 min-w-0 mr-1 rounded-r-full"/g)).toHaveLength(3);
    expect(day4.match(/data-testid="duration-end-marker"/g)).toHaveLength(3);
    const day4Dots = day4.match(/data-testid="duration-dot"[^>]*>/g) ?? [];
    expect(day4Dots).toHaveLength(1);
    expect(day4Dots[0]).toContain('#f59e0b'); // only C starts today
    // C (Hospital, started mid-way on 04/08) shows its amount on ITS start day
    // only — inside the line, hidden lg:inline.
    expect(html.match(/\$150k/g)).toHaveLength(1);
  });

  it('renders NO duration lines for days without guardias (or extra-only days)', () => {
    expect(renderGrid(2026, 7)).not.toContain('data-testid="duration-lines"');
    const extraOnly: Transaction = {
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
    const html = renderGrid(2026, 7, [extraOnly], [makeInstitution({ color: '#ef4444' })]);
    // Extras are not ACTIVE guardias → no duration line for that day.
    expect(html).not.toContain('data-testid="duration-lines"');
  });

  it('no dots cluster / no desktop mini-rows anymore — the duration line is the single representation at ALL breakpoints', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // The old desktop dots cluster (-space-x-1 / hidden lg:flex) and the
    // desktop mini-rows block (hidden lg:block space-y-0.5 mt-auto) are GONE.
    expect(html).not.toContain('-space-x-1');
    expect(html).not.toContain('hidden lg:flex');
    expect(html).not.toContain('hidden lg:block space-y-0.5 mt-auto');
    // The duration container is NOT lg:hidden — it renders on desktop too.
    expect(html).not.toContain('lg:hidden flex flex-col gap-[2px]');
    expect(html).toContain('data-testid="duration-lines"');
  });

  it('a continuing guardia keeps its slot across days (render: the spacer holds its row)', () => {
    // The SLOT MAP itself (B keeping slot 2, A releasing slot 1) is asserted
    // directly in durationLineSlots.test.ts — here we only check the RENDER:
    // B alone at slot 2 renders exactly 1 real line WITH an invisible h-2
    // spacer at slot 1 before it (its absolute Y position never changes — no
    // jump up to row 1 once A ended).
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' }),
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-08' }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Containers on 02/08..08/08 — in order: day02=1st … day08=7th.
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(7);
    const indices: number[] = [];
    let from = 0;
    for (let i = 0; i < 7; i++) {
      indices.push(html.indexOf('data-testid="duration-lines"', from));
      from = indices[i] + 1;
    }
    const day6 = html.slice(indices[4], indices[5]);
    const day7 = html.slice(indices[5], indices[6]);
    const day8 = html.slice(indices[6]);
    for (const day of [day6, day7]) {
      expect(day.match(/data-testid="duration-line"[^>]*>/g)).toHaveLength(1);
      expect(day.match(/data-testid="duration-slot-gap"/g)).toHaveLength(1);
      const gapIdx = day.indexOf('data-testid="duration-slot-gap"');
      const lineIdx = day.search(/data-testid="duration-line"[^>]*>/);
      expect(gapIdx).toBeGreaterThan(-1);
      expect(lineIdx).toBeGreaterThan(-1);
      expect(gapIdx).toBeLessThan(lineIdx); // the gap renders BEFORE the line
      expect(day).not.toContain('data-testid="duration-dot"');
      expect(day).not.toContain('data-testid="duration-end-marker"');
    }
    // Day 08/08: B ends — still slot 2 (spacer above), now with the end marker.
    expect(day8.match(/data-testid="duration-line"[^>]*>/g)).toHaveLength(1);
    expect(day8.match(/data-testid="duration-slot-gap"/g)).toHaveLength(1);
    expect(day8).toContain('data-testid="duration-end-marker"');
  });

  it('a line whose predecessor never existed starts at slot 1 (render: no spacer anywhere)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'b', date: '2026-08-05', endDate: '2026-08-08' }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // 4 containers (05/08..08/08): exactly one line each, and NO spacer at all
    // — slot 1 has no preceding children by definition.
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(4);
    expect(html.match(/data-testid="duration-line"[^>]*>/g)).toHaveLength(4);
    expect(html.match(/data-testid="duration-slot-gap"/g) ?? []).toHaveLength(0);
    // Start day: dot; end day: marker (the line is a single multi-day guardia).
    expect(html.match(/data-testid="duration-dot"[^>]*>/g)).toHaveLength(1);
    expect(html.match(/data-testid="duration-end-marker"/g)).toHaveLength(1);
  });

  it('an institution with no color mapping keeps its slot occupied (spacer), so lines below never shift', () => {
    // Only 'Madariaga' has a color; the 'Fantasma' guardia (03/08→05/08) has no
    // institution in the list → its line cannot be drawn. The slot MUST still be
    // occupied by an invisible spacer: otherwise Madariaga's line below would
    // collapse upward 10px — the exact jump the slot model prevents.
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' }),
      guardia({ id: 'x', institution: 'Fantasma', date: '2026-08-03', endDate: '2026-08-05', amount: 99999 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Containers on 02/08..05/08 (4 days).
    expect(html.match(/data-testid="duration-lines"/g)).toHaveLength(4);
    // Day 03/08 (2nd container): Madariaga line at slot 1 + Fantasma spacer at
    // slot 2 — the spacer renders AFTER the line (below it).
    const indices: number[] = [];
    let from = 0;
    for (let i = 0; i < 4; i++) {
      indices.push(html.indexOf('data-testid="duration-lines"', from));
      from = indices[i] + 1;
    }
    const day3 = html.slice(indices[1], indices[2]);
    const day4 = html.slice(indices[2], indices[3]);
    for (const day of [day3, day4]) {
      expect(day.match(/data-testid="duration-line"[^>]*>/g)).toHaveLength(1);
      expect(day.match(/data-testid="duration-slot-gap"/g)).toHaveLength(1);
      const lineIdx = day.search(/data-testid="duration-line"[^>]*>/);
      const gapIdx = day.indexOf('data-testid="duration-slot-gap"');
      expect(lineIdx).toBeGreaterThan(-1);
      expect(gapIdx).toBeGreaterThan(lineIdx); // Madariaga (slot 1) above the Fantasma spacer (slot 2)
      expect(day).not.toContain('$99k'); // unknown-institution line never draws an amount
    }
  });

  it('renders a screen-reader-only guardia summary (a11y: desktop info is visual-only otherwise)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-02', endDate: '2026-08-05' }),
    ], [makeInstitution({ color: '#ef4444' })]);
    // Start day 02/08: ONE line → SINGULAR summary naming the institution.
    expect(html).toContain('Guardia activa: Madariaga (comienza hoy)');
    // Coverage days 03/08 and 04/08: singular summary WITHOUT any flag.
    expect(html.match(/Guardia activa: Madariaga(?! \()/g)).toHaveLength(2);
    // End day 05/08: "termina hoy". One sr-only span per day with a line (4).
    expect(html.match(/Guardia activa: Madariaga \(termina hoy\)/g)).toHaveLength(1);
    expect(html.match(/class="sr-only"/g)).toHaveLength(4);
    // STRUCTURE: the sr-only summary is a SIBLING of the aria-hidden duration
    // lines (it must NEVER live inside that container or SR users lose it).
    const firstSrOnly = html.indexOf('class="sr-only"');
    const durationContainer = html.indexOf('data-testid="duration-lines"');
    expect(firstSrOnly).toBeGreaterThan(-1);
    expect(durationContainer).toBeGreaterThan(firstSrOnly);
    // The mobile count badge is decorative (aria-hidden): SR users already get
    // the guardia info from the summary — an aria-label on a role-less span is
    // not reliably announced by screen readers.
    expect(html).toContain('aria-hidden="true" class="lg:hidden');
  });
});

describe('CalendarGrid — mobile count badge', () => {
  it('shows the COUNT of starting guardias, not the amount (one guardia)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
    ], [makeInstitution({ color: '#ef4444' })]);
    expect(html).toContain('rounded-md shrink-0">1</span>');
    // The amount appears only inside the line's duration-amount span
    // (hidden lg:inline — CSS-hidden on mobile).
    expect(html.match(/\$100k/g)).toHaveLength(1);
  });

  it('shows "2" for two starting guardias the same day (no +N badge, no amount on mobile)', () => {
    const html = renderGrid(2026, 7, [
      guardia({ id: 'a', date: '2026-08-05', endDate: '2026-08-05', amount: 100000 }),
      guardia({ id: 'b', institution: 'Clínica', date: '2026-08-05', endDate: '2026-08-05', amount: 200000 }),
    ], [
      makeInstitution({ id: 'i1', name: 'Madariaga', color: '#ef4444' }),
      makeInstitution({ id: 'i2', name: 'Clínica', color: '#3b82f6' }),
    ]);
    expect(html).toContain('rounded-md shrink-0">2</span>');
    expect(html).not.toContain('>+1');
    expect(html.match(/\$100k/g)).toHaveLength(1); // duration-amount span
    expect(html.match(/\$200k/g)).toHaveLength(1); // duration-amount span
  });

  it('coverage-only days render NO count badge (the duration line communicates coverage)', () => {
    const html = renderGrid(2026, 7, [guardia()], [makeInstitution({ color: '#ef4444' })]);
    // Only 02/08 has a starting guardia → exactly one badge, value "1".
    expect(html.match(/rounded-md shrink-0">1<\/span>/g)).toHaveLength(1);
    expect(html.match(/\$816k/g)).toHaveLength(1); // duration-amount span (start day only)
  });

  it('extras/procedures do NOT count as starting guardias (ACTIVE only)', () => {
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
    // Extra + guardia start today → the count is 1 (the guardia only).
    expect(html).toContain('rounded-md shrink-0">1</span>');
    // Extras render NO line and NO amount — only the guardia's $300k appears.
    expect((html.match(/\$50k/g) ?? [])).toHaveLength(0);
    expect(html.match(/\$300k/g)).toHaveLength(1); // duration-amount span
  });
});
