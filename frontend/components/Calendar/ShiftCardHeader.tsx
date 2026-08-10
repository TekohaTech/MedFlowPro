import { PaymentStatus, ShiftType, Transaction } from '../../types';
import { cn } from '../../lib/utils';

export function typeLabel(type: ShiftType, t: Record<string, string>): string {
  switch (type) {
    case ShiftType.ACTIVE: return t.tipoGuardia;
    case ShiftType.CONSULTATION: return t.tipoProced;
    case ShiftType.EXTRA: return t.tipoExtra;
    case ShiftType.PASSIVE: return t.tipoIntercons;
    default: return '';
  }
}

export function typeStyle(type: ShiftType): string {
  switch (type) {
    case ShiftType.ACTIVE: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/40';
    case ShiftType.CONSULTATION: return 'text-purple-600 bg-purple-50 dark:bg-purple-900/40';
    case ShiftType.EXTRA: return 'text-amber-600 bg-amber-50 dark:bg-amber-900/40';
    case ShiftType.PASSIVE: return 'text-green-600 bg-green-50 dark:bg-green-900/40';
    default: return '';
  }
}

interface ShiftCardHeaderProps {
  tx: Transaction;
  range?: string;
  t: Record<string, string>;
}

export function ShiftCardHeader({ tx, range, t }: ShiftCardHeaderProps) {
  return (
    <div className="space-y-2">
      <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-tight break-words">{tx.institution}</h4>
      <div className="space-y-0.5">
        <span className="font-black text-base text-slate-900 dark:text-white tracking-tighter">${tx.amount.toLocaleString('es-AR')}</span>
        <span className={cn("block text-[8px] font-black uppercase tracking-widest",
          tx.status === PaymentStatus.PAID ? 'text-green-500' : 'text-orange-400')}>
          {tx.status === PaymentStatus.PAID ? t.pagadoBadge : t.pendienteBadge}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider", typeStyle(tx.type))}>{typeLabel(tx.type, t)}</span>
        {range && (
          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 leading-snug">{range}</span>
        )}
      </div>
    </div>
  );
}
