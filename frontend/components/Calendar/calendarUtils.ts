import { format } from 'date-fns';
import { Transaction, ShiftType } from '../../types';

export function getShiftsForDay(day: Date, transactions: Transaction[]) {
  const dateString = format(day, 'yyyy-MM-dd');
  return transactions.filter(tx => {
    if (tx.date === dateString) return true;
    if (tx.endDate && tx.type === ShiftType.ACTIVE) {
      return tx.date <= dateString && tx.endDate >= dateString;
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
