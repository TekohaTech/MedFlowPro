import { PaymentStatus, ShiftType, Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { formatGuardiaRange, formatDMY } from './calendarUtils';
import { typeLabel, typeStyle } from './ShiftCardHeader';
import { StatusBadge } from './StatusBadge';

interface ItemRowProps {
  s: Transaction;
  t: Record<string, string>;
}

// Cuándo se hizo cada cosa, sin ambigüedad:
// - Guardia: rango legible con duración (reusa formatGuardiaRange).
// - Sub-items (proced./interc.): SIEMPRE con su fecha real + hora, porque el
//   hover puede estar en un día de cobertura distinto al día en que se hizo.
// - Extras: misma regla, fecha + hora si existe.
function formatItemWhen(s: Transaction, t: Record<string, string>): string {
  const d = new Date(`${s.date}T${s.startTime || '00:00'}`);
  const dmy = formatDMY(d);
  if (s.type === ShiftType.ACTIVE) return formatGuardiaRange(s, t.guardiaDe);
  if (s.endDate && s.endDate !== s.date) return formatGuardiaRange(s, t.guardiaDe);
  return s.startTime ? `${dmy} ${s.startTime.slice(0, 5)}` : dmy;
}

// Fila con min-w-0 + truncate: con montos de 7-8 dígitos o textos largos el
// contenido se corta dentro del tooltip en vez de empujar y desbordar.
export function ItemRow({ s, t }: ItemRowProps) {
  return (
    <div className="flex items-center gap-1.5 text-[8px] leading-snug min-w-0">
      <div className={cn("w-2 h-2 rounded-full shrink-0", typeStyle(s.type))} />
      <span className="font-bold text-slate-500 dark:text-slate-400 w-[52px] shrink-0">{typeLabel(s.type, t)}</span>
      <span className="text-slate-400 dark:text-slate-500 font-bold truncate min-w-0">{formatItemWhen(s, t)}</span>
      <span className={cn(
        "font-black whitespace-nowrap shrink-0",
        s.status === PaymentStatus.PAID ? "text-green-600" : "text-slate-900 dark:text-white"
      )}>
        ${s.amount.toLocaleString('es-AR')}
      </span>
      <StatusBadge status={s.status} t={t} />
    </div>
  );
}
