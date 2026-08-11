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
export function formatGuardiaRange(tx: Transaction, guardiaLabel: string): string {
  if (!tx.date || !tx.startTime || !tx.endTime) return '';
  const endDate = tx.endDate || tx.date;
  const start = new Date(`${tx.date}T${tx.startTime}`);
  const end = new Date(`${endDate}T${tx.endTime}`);
  const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const hours = tx.duration && tx.duration > 0
    ? tx.duration
    : Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000)));
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

export function isCoverageDay(day: Date, tx: Transaction) {
  if (!tx.endDate || tx.type !== ShiftType.ACTIVE) return false;
  const dateString = format(day, 'yyyy-MM-dd');
  return tx.date <= dateString && tx.endDate >= dateString && tx.date !== dateString;
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
