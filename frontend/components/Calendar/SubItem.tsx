import { format, type Locale } from 'date-fns';
import { Edit3, Trash2 } from 'lucide-react';
import { Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { typeLabel, typeStyle } from './ShiftCardHeader';

interface SubItemProps {
  sub: Transaction;
  gRange: string;
  t: Record<string, string>;
  locale: Locale;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDeleteRequest: (id: string) => void;
}

export function SubItem({ sub, gRange, t, locale, onOpenForm, onDeleteRequest }: SubItemProps) {
  return (
    <div className="pl-3 border-l-2 border-slate-300 dark:border-slate-600">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0", typeStyle(sub.type))}>{typeLabel(sub.type, t)}</span>
          {(sub.notes || sub.procedureName || sub.specialty || sub.conceptName) && (
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-snug break-words italic min-w-0 flex-1">"{sub.notes || sub.procedureName || sub.specialty || sub.conceptName}"</span>
          )}
        </div>
        {sub.date && (
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-snug break-words">
            {format(new Date(`${sub.date}T00:00`), 'EEEE d/MM', { locale })}
            {sub.startTime && ` ${sub.startTime.slice(0, 5)}`} · {gRange}
          </p>
        )}
        {/* Monto nowrap a la izquierda + botones shrink-0 a la
            derecha: en celular el lápiz/papelera NUNCA tapan el monto. */}
        <div className="flex items-center gap-1.5 justify-between min-w-0">
          <span className="font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap shrink-0">${sub.amount.toLocaleString('es-AR')}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onOpenForm(undefined, sub)}
              className="p-1.5 bg-white dark:bg-slate-800 text-blue-600 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={t.editar}><Edit3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDeleteRequest(sub.id)}
              className="p-1.5 bg-white dark:bg-slate-800 text-red-500 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={t.eliminar}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
