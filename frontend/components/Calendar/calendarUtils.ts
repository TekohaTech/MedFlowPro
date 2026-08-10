import { format } from 'date-fns';
import { Transaction, ShiftType } from '../../types';

// Human-readable range for a transaction: shows duration + full range for
// guardias that cross days (or last 24h+), plain times for same-day items,
// and a dated range for non-guardia items that cross days.
export function formatGuardiaRange(tx: Transaction): string {
  if (!tx.date || !tx.startTime || !tx.endTime) return '';
  const endDate = tx.endDate || tx.date;
  const start = new Date(`${tx.date}T${tx.startTime}`);
  const end = new Date(`${endDate}T${tx.endTime}`);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dmy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hours = tx.duration && tx.duration > 0
    ? tx.duration
    : Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000)));
  const crossDay = !!tx.endDate && tx.endDate !== tx.date;

  if (tx.type === ShiftType.ACTIVE) {
    if (crossDay || hours >= 24) {
      return `Guardia de ${hours}h · ${dmy(start)} ${hm(start)} → ${dmy(end)} ${hm(end)}`;
    }
    return `${hm(start)} → ${hm(end)}`;
  }
  if (crossDay) {
    return `${dmy(start)} ${hm(start)} → ${dmy(end)} ${hm(end)}`;
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
