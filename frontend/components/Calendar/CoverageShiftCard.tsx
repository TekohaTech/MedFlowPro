import type { ReactNode } from 'react';
import { Transaction } from '../../types';
import { CardActions } from './CardActions';
import { StatusBadge } from './StatusBadge';

interface CoverageShiftCardProps {
  tx: Transaction;
  /** Detail text like "Guardia de 48h · comenzó 02/08 08:00 → 04/08 08:00". */
  detail: string;
  /** Institution hex color used as the card accent (may be null → no accent). */
  color?: string | null;
  t: Record<string, string>;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDeleteRequest: (id: string) => void;
  children?: ReactNode;
}

// Card for a multi-day guardia that COVERS the selected day but started
// earlier. Shows institution, color accent and the guardia range — the value
// is deliberately hidden so coverage days never look like earnings.
export function CoverageShiftCard({ tx, detail, color, t, onOpenForm, onDeleteRequest, children }: CoverageShiftCardProps) {
  return (
    <div className="p-4 rounded-[2rem] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-blue-100 dark:hover:border-blue-900 shadow-md shadow-slate-200/60 dark:shadow-black/30 transition-all space-y-3 overflow-hidden">
      <div className="flex gap-3">
        {color && (
          <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-tight break-words">
            {tx.institution}
          </h4>
          <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300 leading-snug break-words">
            {detail}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-black/20 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
              {t.cubreEsteDia}
            </span>
            <StatusBadge status={tx.status} t={t} />
          </div>
        </div>
      </div>

      {children}

      <CardActions tx={tx} t={t} onOpenForm={onOpenForm} onDeleteRequest={onDeleteRequest} />
    </div>
  );
}
