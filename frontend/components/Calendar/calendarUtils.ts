import { format } from 'date-fns';
import { Transaction, ShiftType } from '../../types';

// Shared low-level formatters (zero-padded DD/MM). Reused by
// formatGuardiaRange and ItemRow so the date shape stays in one place.
export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function formatDMY(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

// Human-readable range for a transaction: shows duration + full range for
// guardias that cross days (or last 24h+), plain times for same-day items,
// and a dated range for non-guardia items that cross days.
export function guardiaDurationHours(tx: Transaction): number {
  if (!tx.date || !tx.startTime || !tx.endTime) return 0;
  const endDate = tx.endDate || tx.date;
  const start = new Date(`${tx.date}T${tx.startTime}`);
  const end = new Date(`${endDate}T${tx.endTime}`);
  return tx.duration && tx.duration > 0
    ? tx.duration
    : Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000)));
}

export function formatGuardiaRange(tx: Transaction, guardiaLabel: string): string {
  if (!tx.date || !tx.startTime || !tx.endTime) return '';
  const endDate = tx.endDate || tx.date;
  const start = new Date(`${tx.date}T${tx.startTime}`);
  const end = new Date(`${endDate}T${tx.endTime}`);
  const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const hours = guardiaDurationHours(tx);
  const crossDay = !!tx.endDate && tx.endDate !== tx.date;

  if (tx.type === ShiftType.ACTIVE) {
    if (crossDay || hours >= 24) {
      return `${guardiaLabel} ${hours}h · ${formatDMY(start)} ${hm(start)} → ${formatDMY(end)} ${hm(end)}`;
    }
    return `${hm(start)} → ${hm(end)}`;
  }
  if (crossDay) {
    return `${formatDMY(start)} ${hm(start)} → ${formatDMY(end)} ${hm(end)}`;
  }
  return `${hm(start)} → ${hm(end)}`;
}

// Coverage-day detail for a multi-day guardia, e.g.
// "Guardia de 48h · comenzó 02/08 08:00 → 04/08 08:00". Used on coverage
// cards where the value is deliberately NOT shown.
export function formatCoverageDetail(tx: Transaction, guardiaLabel: string): string {
  if (!tx.date || !tx.startTime || !tx.endTime) return '';
  const endDate = tx.endDate || tx.date;
  const start = new Date(`${tx.date}T${tx.startTime}`);
  const end = new Date(`${endDate}T${tx.endTime}`);
  const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return `${guardiaLabel} ${guardiaDurationHours(tx)}h · comenzó ${formatDMY(start)} ${hm(start)} → ${formatDMY(end)} ${hm(end)}`;
}

// Compact "$408k" style for calendar cells (keeps the previous day-total look
// while each row now shows a SINGLE guardia instead of a summed day).
export function formatCompactAmount(amount: number): string {
  return `$${(amount / 1000).toFixed(0)}k`;
}

export interface DurationLineInfo {
  institution: string;
  startsToday: boolean;
  endsToday: boolean;
}

// Screen-reader-only summary of a day's guardia-duration lines: the colored
// lines are aria-hidden (decorative-only), so SR users must get the info as
// text. Singular for ONE line: "Guardia activa: Madariaga (comienza hoy)".
// Otherwise "Guardias activas: …" with per-line flags — " (termina hoy)" when
// the guardia ends today, " (comienza hoy)" when it starts today, " (comienza
// y termina hoy)" for a 1-day guardia. Neutral Spanish; the app's default
// locale is es-AR. Amounts are intentionally omitted: the day panel (reachable
// by keyboard) shows values.
export function formatSrOnlyDurationSummary(lines: readonly DurationLineInfo[]): string {
  if (lines.length === 0) return '';
  const parts = lines.map((l) => {
    const flag = l.startsToday && l.endsToday
      ? ' (comienza y termina hoy)'
      : l.endsToday
        ? ' (termina hoy)'
        : l.startsToday
          ? ' (comienza hoy)'
          : '';
    return `${l.institution}${flag}`;
  });
  if (parts.length === 1) {
    return `Guardia activa: ${parts[0]}`;
  }
  return `Guardias activas: ${parts.join(', ')}`;
}

// A transaction STARTS on the given day when its own date matches it.
export function isShiftStart(dayStr: string, tx: Transaction): boolean {
  return tx.date === dayStr;
}

// A transaction COVERS the given day without starting on it: a multi-day
// guardia whose range includes the day.
export function isShiftCoverage(dayStr: string, tx: Transaction): boolean {
  return (
    tx.date !== dayStr &&
    !!tx.endDate &&
    tx.type === ShiftType.ACTIVE &&
    tx.date <= dayStr &&
    tx.endDate >= dayStr
  );
}

export function getShiftsForDay(day: Date, transactions: Transaction[]) {
  const dateString = format(day, 'yyyy-MM-dd');
  const guardias = transactions.filter((tx): tx is Transaction & { endDate: string } =>
    tx.type === ShiftType.ACTIVE && !!tx.endDate
  );
  return transactions.filter(tx => {
    if (tx.date === dateString) return true;
    if (tx.endDate && tx.type === ShiftType.ACTIVE) {
      return tx.date <= dateString && tx.endDate >= dateString;
    }
    // Sub-items (interconsultas/procedimientos) follow their guardia across
    // coverage days: they are saved with the guardia's START date, so when a
    // guardia covers this day by range, its same-institution sub-items must be
    // visible here too (the panel groups them by date+institution afterwards).
    if (tx.type === ShiftType.CONSULTATION || tx.type === ShiftType.PASSIVE) {
      return guardias.some(g =>
        g.institution === tx.institution &&
        g.date <= dateString && g.endDate >= dateString &&
        tx.date >= g.date && tx.date <= g.endDate
      );
    }
    return false;
  });
}

export interface OverlapInfo {
  a: Transaction;
  b: Transaction;
  dateLabel: string;
}

export function findOverlaps(txList: Transaction[]): OverlapInfo[] {
  const guardias = txList.filter(tx => tx.type === ShiftType.ACTIVE);
  const results: OverlapInfo[] = [];
  for (let i = 0; i < guardias.length; i++) {
    for (let j = i + 1; j < guardias.length; j++) {
      const a = guardias[i];
      const b = guardias[j];
      const aStart = new Date(`${a.date}T${a.startTime || '00:00'}`);
      const aEnd = new Date(`${a.endDate || a.date}T${a.endTime || '23:59'}`);
      const bStart = new Date(`${b.date}T${b.startTime || '00:00'}`);
      const bEnd = new Date(`${b.endDate || b.date}T${b.endTime || '23:59'}`);
      if (aStart <= bEnd && bStart <= aEnd) {
        const overlapStart = aStart > bStart ? aStart : bStart;
        const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
        const dateLabel = format(overlapStart, 'dd/MM');
        results.push({ a, b, dateLabel });
      }
    }
  }
  return results;
}

export interface GroupedShift {
  guardia?: Transaction;
  subItems: Transaction[];
  standalone: Transaction[];
}

export type GroupingMode = 'day' | 'range';

// 'day' (default): day panel — group by EXACT date + institution; a single
// guardia owns same-day sub-items, multiple guardias each get their own
// group and non-guardia items become standalone cards.
// 'range': hover tooltip — a guardia owns sub-items (only consultas/passivas,
// same institution) whose date falls inside [date, endDate] (multi-day
// coverage). Ownership is NOT exclusive: overlapping guardias can share
// sub-items (tooltip's current behavior). Extras are never owned; unmatched
// items go in ONE trailing standalone group.
export function groupShifts(shifts: Transaction[], mode: GroupingMode = 'day'): GroupedShift[] {
  if (mode === 'range') {
    const result: GroupedShift[] = [];
    const usedIds = new Set<string>();
    const guardias = shifts.filter(s => s.type === ShiftType.ACTIVE);
    const rest = shifts.filter(s => s.type !== ShiftType.ACTIVE);

    for (const g of guardias) {
      const gEnd = g.endDate || g.date;
      const owned = rest.filter(s =>
        s.institution === g.institution &&
        s.date >= g.date && s.date <= gEnd &&
        (s.type === ShiftType.CONSULTATION || s.type === ShiftType.PASSIVE)
      );
      owned.forEach(s => usedIds.add(s.id));
      result.push({ guardia: g, subItems: owned, standalone: [] });
    }

    const standalone = rest.filter(s => !usedIds.has(s.id));
    if (standalone.length > 0) result.push({ guardia: undefined, subItems: [], standalone });
    return result;
  }

  // First pass: group by date + institution to find guardias with sub-items
  const groups = new Map<string, Transaction[]>();
  for (const s of shifts) {
    const key = `${s.date}|${s.institution}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: GroupedShift[] = [];
  const usedIds = new Set<string>();

  for (const items of groups.values()) {
    const guardias = items.filter(s => s.type === ShiftType.ACTIVE);
    const others = items.filter(s => s.type !== ShiftType.ACTIVE);

    if (guardias.length === 1) {
      // Single guardia: it owns sub-items (procedimientos, etc.)
      const g = guardias[0];
      usedIds.add(g.id);
      result.push({
        guardia: g,
        subItems: others.filter(o => !usedIds.has(o.id)),
        standalone: [],
      });
      others.forEach(o => usedIds.add(o.id));
    } else if (guardias.length > 1) {
      // Multiple guardias on same day+institution: each gets its own group,
      // and non-guardia items become standalone cards so they are never hidden.
      for (const g of guardias) {
        usedIds.add(g.id);
        result.push({
          guardia: g,
          subItems: [],
          standalone: [],
        });
      }
      items.forEach(item => {
        if (!usedIds.has(item.id)) {
          result.push({ guardia: undefined, subItems: [], standalone: [item] });
          usedIds.add(item.id);
        }
      });
    } else {
      // No guardia: each item is standalone
      items.forEach(item => {
        if (!usedIds.has(item.id)) {
          result.push({ guardia: undefined, subItems: [], standalone: [item] });
          usedIds.add(item.id);
        }
      });
    }
  }
  return result;
}
