import type { ReactNode } from 'react';
import type { Locale } from 'date-fns';
import { Transaction } from '../../types';
import { ShiftCardHeader } from './ShiftCardHeader';
import { CardActions } from './CardActions';

interface ShiftCardProps {
  tx: Transaction;
  range?: string;
  /** Exact note text to render (guardia: g.notes; standalone: notes || procedureName || specialty || conceptName). */
  notes?: string;
  t: Record<string, string>;
  locale: Locale;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDeleteRequest: (id: string) => void;
  children?: ReactNode;
}

export function ShiftCard({ tx, range, notes, t, onOpenForm, onDeleteRequest, children }: ShiftCardProps) {
  return (
    <div className="p-4 rounded-[2rem] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-blue-100 dark:hover:border-blue-900 shadow-md shadow-slate-200/60 dark:shadow-black/30 transition-all space-y-3 overflow-hidden">
      <ShiftCardHeader tx={tx} range={range} t={t} />

      {notes && (
        <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-2 rounded-xl italic">"{notes}"</p>
      )}

      {children}

      <CardActions tx={tx} t={t} onOpenForm={onOpenForm} onDeleteRequest={onDeleteRequest} />
    </div>
  );
}
