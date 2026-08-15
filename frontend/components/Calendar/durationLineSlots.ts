import { format } from 'date-fns';
import { Transaction, ShiftType } from '../../types';
import { getShiftsForDay, isShiftStart } from './calendarUtils';

/**
 * Pure slot model for the calendar's guardia-duration lines.
 *
 * GEOMETRY: DurationLines renders ONE child per slot — the real line row for
 * occupied slots, an invisible 8px spacer (h-2) for empty ones — with a 2px
 * flex gap. A line in slot s therefore always has EXACTLY s-1 preceding
 * children (8px each + 2px gap), so its absolute Y position is (s-1)*10px
 * from the container top — IDENTICAL across days whether the slots above it
 * are real lines or gaps. A line that ends leaves a spacer in its slot; the
 * lines below NEVER move.
 *
 * IDENTITY: lineKey = `${institution}::${anchorId}`. Each day's lines are
 * built by buildDayLines; the ANCHOR is the ACTIVE guardia with the MIN start
 * date in that line (ties: min id) — it anchors the line's slot identity
 * across days ("anchor", not "leader": in a medical app "leader" reads as
 * "lead physician"). On a split day (one guardia ends while another of the
 * SAME institution starts) the ENDING line keeps the anchor it had the day
 * before, so its key — and its slot — persist; the STARTING guardia is a
 * different anchor → takes the first free slot.
 *
 * SLOT RULE: computeLineSlots simulates the month day-by-day. Existing keys
 * re-occupy their slot every day; a NEW key takes the FIRST FREE slot (below
 * everything active that day); keys that stop appearing simply stop occupying
 * (their slot is released). Existing lines NEVER move and NEVER renumber.
 *
 * KNOWN LIMITATION: when a 1-day guardia AND a multi-day guardia of the SAME
 * institution start the SAME day, the split-day lines can COLLIDE: the ending
 * line anchors anchor(et) and the starting line anchors anchor(st); when the
 * 1-day guardia wins the min-id tie-break, BOTH anchors are that same tx →
 * both lines share one key (and one slot) and overlap. Pinned by a test in
 * durationLineSlots.test.ts; not yet solved.
 */
export interface DayLine {
  institution: string;
  startsToday: boolean;
  endsToday: boolean;
  /** Identity for slot persistence: the ACTIVE guardia with the MIN start
      date in that line — a continuing guardia keeps the SAME key across
      days. */
  anchorId: string;
}

// Shared per-day line builder, used by BOTH the slot simulation and the day
// render — the visual order can never desync from the slot model. Non-split
// days keep ONE line whose anchor is the earliest-starting ACTIVE guardia
// covering the day.
export function buildDayLines(dayStr: string, shifts: Transaction[]): DayLine[] {
  const activeShifts = shifts.filter(s => s.type === ShiftType.ACTIVE);
  const startTxs = activeShifts.filter(s => isShiftStart(dayStr, s)); // starts today
  const endTxs = activeShifts.filter(s => s.endDate === dayStr);      // ends today
  // Ordering: EARLIEST start date of the ACTIVE guardia covering this day, so
  // a guardia starting mid-way through another's duration renders BELOW the
  // ongoing one — consistently across every day they co-cover.
  const minStartByInstitution = new Map<string, string>();
  for (const s of activeShifts) {
    const cur = minStartByInstitution.get(s.institution);
    if (!cur || s.date < cur) minStartByInstitution.set(s.institution, s.date);
  }
  const ordered = [...minStartByInstitution.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([institution]) => institution);
  const anchor = (txs: Transaction[]) =>
    [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];
  const lines: DayLine[] = [];
  for (const institution of ordered) {
    const st = startTxs.filter(s => s.institution === institution);
    const et = endTxs.filter(s => s.institution === institution);
    // A guardia that ends today WITHOUT starting today (multi-day reaching its
    // end)…
    const multiEnd = et.some(s => !isShiftStart(dayStr, s));
    // …or starts today WITHOUT ending today (continues tomorrow).
    const multiStart = st.some(s => s.endDate !== dayStr);
    // Two DIFFERENT guardias touch today (one ends, another starts) → split
    // into TWO lines so the fusion never looks like a 1-day guardia.
    const split = (multiEnd && st.length > 0) || (multiStart && et.length > 0);
    if (split) {
      // The ENDING line (A): segment + end marker, NO dot.
      lines.push({ institution, startsToday: false, endsToday: true, anchorId: anchor(et).id });
      // The STARTING line (B): dot (+ amount); end marker ONLY when B itself
      // is a 1-day guardia.
      lines.push({ institution, startsToday: true, endsToday: st.some(s => s.endDate === dayStr), anchorId: anchor(st).id });
    } else {
      const active = activeShifts.filter(s => s.institution === institution);
      lines.push({ institution, startsToday: st.length > 0, endsToday: et.length > 0, anchorId: anchor(active).id });
    }
  }
  return lines;
}

export function lineKey(line: DayLine): string {
  return `${line.institution}::${line.anchorId}`;
}

export function computeLineSlots(
  calendarDays: Date[],
  transactions: Transaction[],
): Map<string, number> {
  const slots = new Map<string, number>();
  for (const day of calendarDays) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const lines = buildDayLines(dayStr, getShiftsForDay(day, transactions));
    const occupied = new Set<number>();
    for (const line of lines) {
      const s = slots.get(lineKey(line));
      if (s !== undefined) occupied.add(s);
    }
    for (const line of lines) {
      const key = lineKey(line);
      if (!slots.has(key)) {
        let s = 1;
        while (occupied.has(s)) s++;
        slots.set(key, s);
        occupied.add(s);
      }
    }
  }
  return slots;
}
