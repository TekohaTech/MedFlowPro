import { Edit3, Trash2 } from 'lucide-react';
import { Transaction } from '../../types';

interface CardActionsProps {
  tx: Transaction;
  t: Record<string, string>;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDeleteRequest: (id: string) => void;
}

export function CardActions({ tx, t, onOpenForm, onDeleteRequest }: CardActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button onClick={() => onOpenForm(undefined, tx)}
        className="p-2.5 bg-white dark:bg-slate-800 text-blue-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
        title={t.editar}><Edit3 className="w-4 h-4" /></button>
      <button onClick={() => onDeleteRequest(tx.id)}
        className="p-2.5 bg-white dark:bg-slate-800 text-red-500 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
        title={t.eliminar}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}
